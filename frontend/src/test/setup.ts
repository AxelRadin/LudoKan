import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'test-site-key');

vi.mock('react-google-recaptcha', () => {
  const MockReCAPTCHA = React.forwardRef<
    { reset: () => void },
    { onChange?: (token: string | null) => void }
  >(function MockReCAPTCHA(props, ref) {
    const { onChange } = props;
    React.useImperativeHandle(ref, () => ({ reset: () => {} }));
    React.useEffect(() => {
      onChange?.('test-captcha-token');
    }, [onChange]);
    return null;
  });
  MockReCAPTCHA.displayName = 'ReCAPTCHA';
  return { default: MockReCAPTCHA };
});
