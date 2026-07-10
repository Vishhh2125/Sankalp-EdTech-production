import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { googleLogin } from '../redux/slices/authSlice';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const dispatch = useDispatch();
  const [googleError, setGoogleError] = useState(null);

  // androidClientId uses the custom URI scheme flow:
  // com.googleusercontent.apps.186270379182-7r2q0ehe3ntu65h0n5hiela1d8otvjj7:/oauth2redirect/google
  // This requires "Enable custom URI scheme" to be checked in Google Cloud Console
  // under the Android OAuth client's Advanced Settings.
  const clientId = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const clientIdFirstPart = (clientId || '').split('.').shift();
  const customRedirectUri = clientIdFirstPart 
    ? `com.googleusercontent.apps.${clientIdFirstPart}:/oauth2redirect/google`
    : undefined;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: AuthSession.makeRedirectUri({
      native: customRedirectUri,
    }),
  });

  useEffect(() => {
    console.log('[GoogleAuth] redirectUri:', customRedirectUri);
    console.log('[GoogleAuth] Android Client ID:', process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
    console.log('[GoogleAuth] Web Client ID:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  }, [customRedirectUri]);

  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleError(null);
      const idToken = response.params.id_token || response.authentication?.idToken;
      console.log('[GoogleAuth] response type:', response.type);
      console.log('[GoogleAuth] id_token present:', !!idToken);
      if (!idToken) {
        setGoogleError('Google sign-in failed. No token received.');
        return;
      }
      dispatch(googleLogin({ idToken }));
    } else if (response?.type === 'error') {
      console.log('[GoogleAuth] error:', response.error, response.params);
      setGoogleError(
        response?.error?.message ||
        response?.params?.error_description ||
        'Google sign-in failed. Please try again.'
      );
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      console.log('[GoogleAuth] user dismissed/cancelled');
    }
  }, [response, dispatch]);

  return { promptAsync, loading: !request, googleError };
}
