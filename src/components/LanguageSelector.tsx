import LanguageIcon from '@mui/icons-material/Language';
import { Box, FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'he', labelKey: 'language.he' },
] as const;

export default function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('he') ? 'he' : 'en';

  const handleChange = (event: SelectChangeEvent) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LanguageIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="language-select-label">{t('language.label')}</InputLabel>
        <Select
          labelId="language-select-label"
          value={currentLang}
          label={t('language.label')}
          onChange={handleChange}
          sx={{ bgcolor: 'background.paper' }}
        >
          {LANGUAGES.map(({ code, labelKey }) => (
            <MenuItem key={code} value={code}>
              {t(labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
