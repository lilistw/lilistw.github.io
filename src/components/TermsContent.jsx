import { useTranslation } from 'react-i18next';

export default function TermsContent() {
  const { t } = useTranslation();

  const sections = t('terms.sections', { returnObjects: true });

  return (
    <>
      {sections.map((section, index) => (
        <section key={index}>
          <h3>{section.title}</h3>

          {section.paragraphs?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          {section.list?.length > 0 && (
            <ul>
              {section.list.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  );
}