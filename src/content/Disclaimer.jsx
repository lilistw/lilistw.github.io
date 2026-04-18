import { WarningAmber } from '@mui/icons-material'

export default function Disclaimer() {
  return (
    <div className="disclaimer">
      <WarningAmber className="disclaimer-icon" />
      <span>
        Данните са изчислени автоматично и може да съдържат неточности. 
        Проверете резултатите преди подаване към НАП.
      </span>
    </div>
  );
}