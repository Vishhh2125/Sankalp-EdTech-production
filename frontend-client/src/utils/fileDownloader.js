import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { showAlert } from '../services/alertService';

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

  // 1. Sanitize file name and extension
  let extension = fileType ? fileType.toLowerCase() : '';
  if (!extension) {
    // Attempt to extract extension from the URL if not provided
    const urlParts = url.split('?')[0].split('.');
    if (urlParts.length > 1) {
      extension = urlParts[urlParts.length - 1].toLowerCase();
    }
  }
  if (extension && !extension.startsWith('.')) {
    extension = `.${extension}`;
  }

  const sanitizedTitle = (title || 'file').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${sanitizedTitle}${extension || '.bin'}`;

  // 2. Platform specific download
  if (Platform.OS === 'android') {
    // Alert the user that the download is starting
    showAlert(
      'Downloading',
      `Starting download for "${title || 'file'}". You can check the notification bar for progress.`
    );

    if (ReactNativeBlobUtil) {
      const { config, fs } = ReactNativeBlobUtil;
      try {
        const downloadDir = fs.dirs.LegacyDownloadDir || '/storage/emulated/0/Download';
        const destPath = `${downloadDir}/${filename}`;
        
        await config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: title || 'Downloading Material',
            description: `Downloading ${filename} from app`,
            path: destPath,
            mediaScannable: true,
          },
        }).fetch('GET', url);
        
        console.log(`[fileDownloader] Android download completed successfully to ${destPath}`);
      } catch (error) {
        console.error('[fileDownloader] Android native download failed:', error);
        showAlert('Download Failed', 'Could not complete the download via Download Manager.');
      }
    } else {
      // Fallback to expo-file-system and sharing if react-native-blob-util is not built/linked yet
      console.warn('[fileDownloader] react-native-blob-util not available, using expo-sharing fallback');
      try {
        const localUri = `${FileSystem.documentDirectory}${filename}`;
        const downloadResumable = FileSystem.createDownloadResumable(url, localUri);
        const { uri } = await downloadResumable.downloadAsync();
        
        await Sharing.shareAsync(uri);
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
      const downloadResumable = FileSystem.createDownloadResumable(url, localUri);
      const { uri } = await downloadResumable.downloadAsync();
      
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('[fileDownloader] iOS download failed:', error);
      showAlert('Download Failed', 'Could not open the save dialog.');
    }
  }
};
