import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { googleLogin } from '../redux/slices/authSlice';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const dispatch = useDispatch();
  const [googleError, setGoogleError] = useState(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleError(null);
      const idToken = response.params.id_token || response.authentication?.idToken;
      if (!idToken) {
        setGoogleError('Google sign-in failed. No token received.');
        return;
      }
      dispatch(googleLogin({ idToken }));
    } else if (response?.type === 'error') {
      setGoogleError('Google sign-in failed. Please try again.');
    }
    // 'dismiss' and 'cancel' are silently ignored — user chose not to proceed
  }, [response, dispatch]);

  return { promptAsync, loading: !request, googleError };
}
