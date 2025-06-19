import { db } from './db';
import { accounts } from '@shared/schema';

async function seedAccounts() {
  console.log('Seeding accounts...');
  
  try {
    // Insert demo accounts
    await db.insert(accounts).values([
      {
        name: 'AvaFeatures Demo Account',
        platform: 'AvaFeatures',
        login: 'demo_ava_001',
        password: 'demo_password',
        server: 'ava-demo.com',
        isActive: true,
        riskMultiplier: '1.0'
      },
      {
        name: 'MetaTrader Demo Account',
        platform: 'MetaTrader',
        login: 'demo_mt5_001',
        password: 'demo_password',
        server: 'mt5-demo.com',
        isActive: true,
        riskMultiplier: '1.0'
      },
      {
        name: 'TradingView Paper Account',
        platform: 'TradingView',
        login: 'paper_tv_001',
        password: 'demo_password',
        server: 'tradingview.com',
        isActive: false,
        riskMultiplier: '1.0'
      }
    ]).onConflictDoNothing();
    
    console.log('Accounts seeded successfully!');
  } catch (error) {
    console.error('Error seeding accounts:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAccounts().then(() => process.exit(0));
}

export { seedAccounts };