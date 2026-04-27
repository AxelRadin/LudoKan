import { Box, Divider, Typography } from '@mui/material';

export type LegalDocumentModel = Readonly<{
  title: string;
  version: string;
  sections: readonly Readonly<{ title: string; content: string }>[];
}>;

export function LegalDocumentSections({
  document,
}: Readonly<{ document: LegalDocumentModel }>) {
  return (
    <>
      <Typography
        variant="h5"
        fontWeight={600}
        sx={{ mb: 0.5, color: 'secondary.main' }}
      >
        {document.title}
      </Typography>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ mb: 4, display: 'block' }}
      >
        {document.version}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {document.sections.map((section, i) => (
          <Box key={`${section.title}-${i}`}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{ mb: 1, color: 'secondary.main' }}
            >
              {section.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                whiteSpace: 'pre-line',
                lineHeight: 1.8,
                textAlign: 'justify',
              }}
            >
              {section.content}
            </Typography>
            {i < document.sections.length - 1 && <Divider sx={{ mt: 3 }} />}
          </Box>
        ))}
      </Box>
    </>
  );
}
