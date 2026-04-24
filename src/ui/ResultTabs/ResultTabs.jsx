import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Tabs, Tab } from '@mui/material'

import TradesTab from './TradesTab'
import HoldingsTab from './HoldingsTab'
import DividendsTab from './DividendsTab'
import InterestTab from './InterestTab'
import DevTab from './DevTab'
import ExcelCopyButton from './ExcelCopyButton'

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

export default function ResultTabs({ result, inputJsonText, outputJsonText }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  const hasDividends = result.dividends.length > 0
  const hasInterest =
    result.interest.filter(r => !r._total).length > 0

  const tabs = [
    { label: t('app.tabs.trades') },
    { label: t('app.tabs.positions') },
    ...(hasDividends ? [{ label: t('app.tabs.dividends') }] : []),
    ...(hasInterest ? [{ label: t('app.tabs.interest') }] : []),
    ...(DEV_MODE ? [{ label: t('app.tabs.dev') }] : []),
  ]

  let idx = 0
  const TAB_TRADES = idx++
  const TAB_HOLDINGS = idx++
  const TAB_DIVIDENDS = hasDividends ? idx++ : -1
  const TAB_INTEREST = hasInterest ? idx++ : -1
  const TAB_DEV = DEV_MODE ? idx++ : -1

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ flex: 1 }}
        >
          {tabs.map((tItem, i) => (
            <Tab key={i} label={tItem.label} />
          ))}
        </Tabs>
        <ExcelCopyButton result={result} />
      </Box>

      <TabPanel value={tab} index={TAB_TRADES}>
        <TradesTab result={result} />
      </TabPanel>

      <TabPanel value={tab} index={TAB_HOLDINGS}>
        <HoldingsTab result={result} />
      </TabPanel>

      {hasDividends && (
        <TabPanel value={tab} index={TAB_DIVIDENDS}>
          <DividendsTab result={result} />
        </TabPanel>
      )}

      {hasInterest && (
        <TabPanel value={tab} index={TAB_INTEREST}>
          <InterestTab result={result} />
        </TabPanel>
      )}

      {DEV_MODE && (
        <TabPanel value={tab} index={TAB_DEV}>
          <DevTab
            inputJsonText={inputJsonText}
            outputJsonText={outputJsonText}
          />
        </TabPanel>
      )}
    </Box>
  )
}