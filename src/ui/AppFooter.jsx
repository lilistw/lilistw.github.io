import { useTranslation } from 'react-i18next';
import { Tooltip } from '@mui/material';
import { GitHub, InfoOutlined, Favorite, PrivacyTipOutlined } from '@mui/icons-material';

export default function AppFooter({ onShowTerms, onShowPrivacy }) {
  const { t } = useTranslation();

  return (
    <footer className="app-footer">
      <div className="footer-links">
        <a
          href="https://github.com/lilistw/lilistw.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <GitHub sx={{ fontSize: 16 }} />
          GitHub
        </a>

        <span className="footer-sep">·</span>

        <button
          type="button"
          className="footer-link footer-btn"
          onClick={onShowTerms}
        >
          <InfoOutlined sx={{ fontSize: 16 }} />
          {t('app.footer.termsLink')}
        </button>

        <span className="footer-sep">·</span>

        <button
          type="button"
          className="footer-link footer-btn"
          onClick={onShowPrivacy}
        >
          <PrivacyTipOutlined sx={{ fontSize: 16 }} />
          {t('app.footer.privacyLink')}
        </button>

        <span className="footer-sep footer-sep-before-support">·</span>
        <span className="footer-break" aria-hidden="true" />

        <Tooltip title={t('app.footer.supportTooltip')} arrow>
          <a
            href="https://dmsbg.com/7997/dms-divite/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link footer-btn"
          >
            <Favorite sx={{ fontSize: 16 }} />
            {t('app.footer.supportLink')}
          </a>
        </Tooltip>
      </div>

      <div className="footer-copy">
        {t('app.copyright')}
      </div>
    </footer>
  );
}