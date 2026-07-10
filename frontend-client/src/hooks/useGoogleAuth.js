import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { googleLogin } from '../redux/slices/authSlice';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const dispatch = useDispatch();
  const [googleError, setGoogleError] = useState(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // Force the token to be issued against the web client ID so the backend
    // can verify it with google-auth-library using GOOGLE_CLIENT_ID (= web client ID).
    // Without this, the ID token audience may be the Android client ID,
    // which the backend does not recognise.
    selectAccount: true,
    redirectUri: AuthSession.makeRedirectUri({
      native: 'com.googleusercontent.apps.982027727139-urdpt7ckau4iv14ahmvm17augrgjeit6:/oauth2redirect/google',
    }),
  });

  // Log the redirect URI on mount so you can register it in Google Cloud Console
  useEffect(() => {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: false });
    console.log('[GoogleAuth] redirectUri:', redirectUri);
    console.log('[GoogleAuth] Android Client ID:', process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
    console.log('[GoogleAuth] Web Client ID:', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  }, []);

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
      // silently ignored — user chose not to proceed
      console.log('[GoogleAuth] user dismissed/cancelled');
    }
  }, [response, dispatch]);

  return { promptAsync, loading: !request, googleError };
}
