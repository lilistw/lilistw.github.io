/**
 * Parses Statement and Account Information sections into raw string objects.
 *
 * @param {string[][]} rows
 * @returns {{ statement: object, account: object }}
 */
export function parseStatementInfo(rows) {
  const stmt = key => {
    const row = rows.find(r => r[0] === 'Statement' && r[1] === 'Data' && r[2] === key)
    return row ? (row[3] || '').trim() : ''
  }
  const acct = key => {
    const row = rows.find(r => r[0] === 'Account Information' && r[1] === 'Data' && r[2] === key)
    return row ? (row[3] || '').trim() : ''
  }
  return {
    statement: {
      brokerName:    stmt('BrokerName'),
      brokerAddress: stmt('BrokerAddress'),
      title:         stmt('Title'),
      period:        stmt('Period'),
      generatedAt:   stmt('WhenGenerated'),
    },
    account: {
      name:         acct('Name'),
      accountId:    acct('Account'),
      accountType:  acct('Account Type'),
      customerType: acct('Customer Type'),
      capabilities: acct('Capabilities'),
      baseCurrency: acct('Base Currency'),
    },
  }
}
