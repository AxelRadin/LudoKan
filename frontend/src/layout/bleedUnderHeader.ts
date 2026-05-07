import type { Theme } from '@mui/material/styles';

const HEADER_SPACER_XS = '66px';
const HEADER_SPACER_MD = '68px';

const MAIN_TOP_PADDING_UNITS = 8;

type TopPad = { xs: string; md: string };

const zeroPad: TopPad = { xs: '0px', md: '0px' };

export function bleedUnderHeader(
  theme: Theme,
  extraTopPadding: TopPad = zeroPad
) {
  const mainPad = theme.spacing(MAIN_TOP_PADDING_UNITS);
  return {
    marginTop: {
      xs: `calc(-1 * (${HEADER_SPACER_XS} + ${mainPad}))`,
      md: `calc(-1 * (${HEADER_SPACER_MD} + ${mainPad}))`,
    },
    paddingTop: {
      xs: `calc(${HEADER_SPACER_XS} + ${mainPad} + ${extraTopPadding.xs})`,
      md: `calc(${HEADER_SPACER_MD} + ${mainPad} + ${extraTopPadding.md})`,
    },
  };
}
