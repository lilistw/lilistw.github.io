import { FiFileText, FiTrendingUp, FiShield } from 'react-icons/fi'

export default function AboutSection() {
  return (
    <section className="about">
      <div className="about-card about-card--green">
        <div className="about-card-header">
          <div className="about-card-icon">
            <FiFileText size={18} aria-hidden="true" />
          </div>
          <h2>За какво служи</h2>
        </div>
        <p>Обработва Activity Statement от IBKR и изчислява облагаемите доходи от акции за годишната данъчна декларация.</p>
      </div>

      <div className="about-card about-card--indigo">
        <div className="about-card-header">
          <div className="about-card-icon">
            <FiTrendingUp size={18} aria-hidden="true" />
          </div>
          <h2>Метод</h2>
        </div>
        <p>Среднопретеглена цена на придобиване по символ с конвертиране в BGN по курс на БНБ за датата на всяка сделка.</p>
      </div>

      <div className="about-card about-card--amber">
        <div className="about-card-header">
          <div className="about-card-icon">
            <FiShield size={18} aria-hidden="true" />
          </div>
          <h2>Поверителност</h2>
        </div>
        <p>Всичко се изпълнява в браузъра ви. Никакви данни не се качват или съхраняват.</p>
      </div>
    </section>
  )
}
