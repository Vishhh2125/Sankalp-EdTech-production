import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { showAlert } from '../services/alertService';
import { API_BASE_URL } from '../constants/config';

// Conditional dynamic import for react-native-blob-util to avoid loading errors on iOS/Web
let ReactNativeBlobUtil = null;
if (Platform.OS === 'android') {
  try {
    ReactNativeBlobUtil = require('react-native-blob-util').default;
  } catch (e) {
    console.warn('react-native-blob-util could not be loaded:', e);
  }
}

/**
 * Resolves relative or localhost URLs to a fully qualified, network-accessible URL.
 */
export function resolveDownloadUrl(url) {
  if (!url) return '';
  if (url.startsWith('/')) {
    const cleanBase = API_BASE_URL.replace(/\/$/, '');
    return `${cleanBase}${url}`;
  }
  if (url.includes('/ott-media/')) {
    const relativePath = url.substring(url.indexOf('/ott-media/'));
    const cleanBase = API_BASE_URL.replace(/\/$/, '');
    return `${cleanBase}${relativePath}`;
  }
  if (url.includes('/uploads/')) {
    const relativePath = url.substring(url.indexOf('/uploads/'));
    const cleanBase = API_BASE_URL.replace(/\/$/, '');
    return `${cleanBase}${relativePath}`;
  }
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const apiHost = API_BASE_URL.split('://')[1]?.split(':')[0];
      if (apiHost) {
        return url.replace('localhost', apiHost).replace('127.0.0.1', apiHost);
      }
    } catch {
      // Ignore URL parse error
    }
  }
  return url;
}

/**
 * Downloads a file to the phone's storage.
 * - On Android: Uses system DownloadManager to save to public Downloads and show status bar notification.
 * - On iOS: Downloads to a temporary path and opens the Save to Files share sheet.
 * 
 * @param {string} url The remote file URL to download.
 * @param {string} title The title/name of the file (used for filename and alerts).
 * @param {string} fileType The file extension (e.g. 'pdf', 'png'). If omitted, it will try to infer or default.
 */
export const downloadFile = async (url, title, fileType) => {
  if (!url) {
    showAlert('Error', 'Invalid download URL');
    return;
  }

  const resolvedUrl = resolveDownloadUrl(url);

  // 1. Sanitize file name and extension
  let extension = fileType ? fileType.toLowerCase() : '';
  if (!extension) {
    const urlParts = resolvedUrl.split('?')[0].split('.');
    if (urlParts.length > 1) {
      extension = urlParts[urlParts.length - 1].toLowerCase();
    }
  }
  if (extension && !extension.startsWith('.')) {
    extension = `.${extension}`;
  }

  const extClean = (extension || '').replace(/^\./, '').toLowerCase();
  const mimeType = extClean === 'pdf' ? 'application/pdf' :
                   extClean === 'png' ? 'image/png' :
                   extClean === 'jpg' || extClean === 'jpeg' ? 'image/jpeg' :
                   extClean === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                   extClean === 'doc' ? 'application/msword' :
                   extClean === 'ppt' || extClean === 'pptx' ? 'application/vnd.ms-powerpoint' :
                   'application/octet-stream';

  const sanitizedTitle = (title || 'file').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedTitle}${extension || '.pdf'}`;

  // 2. Platform specific download
  if (Platform.OS === 'android') {
    showAlert(
      'Downloading',
      `Starting download for "${title || 'file'}". You can check the notification bar for progress.`
    );

    let success = false;
    if (ReactNativeBlobUtil) {
      const { config, fs } = ReactNativeBlobUtil;
      try {
        const downloadDir = fs.dirs.LegacyDownloadDir || '/storage/emulated/0/Download';
        const destPath = `${downloadDir}/${filename}`;
        
        await config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: title || 'Downloading File',
            description: `Downloading ${filename} from app`,
            path: destPath,
            mime: mimeType,
            mediaScannable: true,
          },
        }).fetch('GET', resolvedUrl);
        
        console.log(`[fileDownloader] Android download completed successfully to ${destPath}`);
        success = true;
      } catch (error) {
        console.warn('[fileDownloader] DownloadManager failed, falling back to Expo Sharing:', error);
      }
    }

    if (!success) {
      try {
        const localUri = `${FileSystem.documentDirectory}${filename}`;
        const downloadResumable = FileSystem.createDownloadResumable(resolvedUrl, localUri);
        const { uri } = await downloadResumable.downloadAsync();
        
        await Sharing.shareAsync(uri, {
          mimeType: mimeType,
          dialogTitle: `Save / Share ${title || 'File'}`,
          UTI: extClean === 'pdf' ? 'com.adobe.pdf' : undefined,
        });
      } catch (error) {
        console.error('[fileDownloader] Fallback download failed:', error);
        showAlert('Download Failed', 'Could not download the file.');
      }
    }
  } else {
    // iOS and other platforms
    showAlert('Downloading', `Preparing "${title || 'file'}"...`);

    try {
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      const downloadResumable = FileSystem.createDownloadResumable(resolvedUrl, localUri);
      const { uri } = await downloadResumable.downloadAsync();
      
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: mimeType,
          dialogTitle: `Save / Share ${title || 'File'}`,
          UTI: extClean === 'pdf' ? 'com.adobe.pdf' : undefined,
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('[fileDownloader] iOS download failed:', error);
      showAlert('Download Failed', 'Could not open the save dialog.');
    }
  }
};
