import { Alert } from '@mui/material';

type Props = { message: string };

export default function ErrorAlert({ message }: Props) {
  return (
    <Alert severity="error" sx={{ borderRadius: 2 }}>
      {message}
    </Alert>
  );
}
