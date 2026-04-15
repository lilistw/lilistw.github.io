import { FiAlertTriangle } from 'react-icons/fi'

export default function Disclaimer() {
  return (
    <div className="disclaimer">
      <FiAlertTriangle className="disclaimer-icon" />
      <span>
        Данните са изчислени автоматично и може да съдържат неточности. 
        Проверете резултатите преди подаване към НАП.
      </span>
    </div>
  );
}