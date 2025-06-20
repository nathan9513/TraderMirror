import { pgTable, text, serial, timestamp, boolean, decimal, integer, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(), // "BUY" or "SELL"
  volume: decimal("volume", { precision: 10, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 5 }).notNull(),
  takeProfit: decimal("take_profit", { precision: 10, scale: 5 }),
  stopLoss: decimal("stop_loss", { precision: 10, scale: 5 }),
  status: text("status").notNull(), // "SUCCESS", "FAILED", "PENDING"
  latency: integer("latency"), // in milliseconds
  sourcePlatform: text("source_platform").default("MetaTrader"),
  targetPlatform: text("target_platform").default("AvaFeatures"),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Multi-account support (slave accounts only)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform", { enum: ["MetaTrader", "AvaFeatures", "TradingView"] }).notNull(),
  server: text("server"),
  login: text("login"),
  password: text("password"),
  isActive: boolean("is_active").default(true),
  riskMultiplier: decimal("risk_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  isReplicationLocked: boolean("is_replication_locked").default(false),
  lastManualTrade: timestamp("last_manual_trade"),
  allowManualTrading: boolean("allow_manual_trading").default(true),
  conflictResolution: text("conflict_resolution", { enum: ["pause_replication", "block_manual", "allow_both"] }).default("pause_replication"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  platform: text("platform").notNull(), // "MetaTrader" or "AvaFeatures"
  status: text("status").notNull(), // "Connected", "Disconnected", "Connecting"
  server: text("server"),
  account: text("account"),
  lastPing: text("last_ping"), // timestamp as string
  lastUpdate: timestamp("last_update").defaultNow().notNull(),
});

export const accountConfigurations = pgTable("account_configurations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  
  // Connection Settings per account
  mt5Server: text("mt5_server"),
  mt5Login: text("mt5_login"),
  mt5Password: text("mt5_password"),
  avaEndpoint: text("ava_endpoint"),
  avaAccountId: text("ava_account_id"),
  avaApiKey: text("ava_api_key"),
  
  // Risk settings per account
  riskMultiplier: decimal("risk_multiplier", { precision: 3, scale: 1 }).default("1.0"),
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  isMirrorActive: boolean("is_mirror_active").default(false),
  isAutoReconnectEnabled: boolean("is_auto_reconnect_enabled").default(true),
  riskMultiplier: decimal("risk_multiplier", { precision: 3, scale: 1 }).default("1.0"),
  
  // Trading Features
  enableTakeProfit: boolean("enable_take_profit").default(false),
  takeProfitPoints: integer("take_profit_points").default(100),
  enableStopLoss: boolean("enable_stop_loss").default(false),
  stopLossPoints: integer("stop_loss_points").default(50),
  enableTrailingStop: boolean("enable_trailing_stop").default(false),
  trailingStopPoints: integer("trailing_stop_points").default(30),
  maxSlippage: integer("max_slippage").default(3),
  
  // Global settings only
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stats = pgTable("stats", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  tradesCount: integer("trades_count").default(0),
  successfulTrades: integer("successful_trades").default(0),
  failedTrades: integer("failed_trades").default(0),
  avgLatency: integer("avg_latency").default(0),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  timestamp: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  lastUpdate: true,
});

export const insertAccountConfigurationSchema = createInsertSchema(accountConfigurations).omit({
  id: true,
  updatedAt: true,
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  id: true,
  updatedAt: true,
});

export const insertStatsSchema = createInsertSchema(stats).omit({
  id: true,
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type AccountConfiguration = typeof accountConfigurations.$inferSelect;
export type InsertAccountConfiguration = z.infer<typeof insertAccountConfigurationSchema>;
export type Configuration = typeof configurations.$inferSelect;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Stats = typeof stats.$inferSelect;
export type InsertStats = z.infer<typeof insertStatsSchema>;
