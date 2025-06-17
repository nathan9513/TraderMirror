//+------------------------------------------------------------------+
//|                                               MT5_EA_Lantea.mq5 |
//|                           Expert Advisor per Lantea Trade Sync  |
//+------------------------------------------------------------------+
#property copyright "Lantea Trading System"
#property version   "1.00"
#property strict

// Parametri configurabili
input string ServerURL = "http://localhost:5000/api/mt5/trade";
input bool   EnableSync = true;
input int    CheckInterval = 1000; // millisecondi

// Variabili globali
datetime lastTradeTime = 0;
string lastTradeDetails = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    Print("Lantea Trade Sync EA avviato");
    Print("Server URL: ", ServerURL);
    Print("Sync attivo: ", EnableSync);
    
    // Avvia monitoraggio trade
    EventSetTimer(CheckInterval / 1000);
    
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    Print("Lantea Trade Sync EA disattivato");
}

//+------------------------------------------------------------------+
//| Timer function - controlla nuovi trade                          |
//+------------------------------------------------------------------+
void OnTimer()
{
    if(!EnableSync) return;
    
    // Controlla per nuovi trade
    CheckForNewTrades();
}

//+------------------------------------------------------------------+
//| Funzione per controllare nuovi trade                            |
//+------------------------------------------------------------------+
void CheckForNewTrades()
{
    // Ottieni l'ultimo trade dalla history
    if(HistorySelect(TimeCurrent() - 60, TimeCurrent())) // Ultimi 60 secondi
    {
        int totalDeals = HistoryDealsTotal();
        
        for(int i = totalDeals - 1; i >= 0; i--)
        {
            ulong dealTicket = HistoryDealGetTicket(i);
            if(dealTicket > 0)
            {
                datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
                
                // Se è un nuovo trade
                if(dealTime > lastTradeTime)
                {
                    ProcessNewTrade(dealTicket);
                    lastTradeTime = dealTime;
                }
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Processa un nuovo trade e lo invia a Lantea                     |
//+------------------------------------------------------------------+
void ProcessNewTrade(ulong dealTicket)
{
    // Ottieni dettagli del trade
    string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
    double volume = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
    double price = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
    ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
    datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
    
    // Determina tipo trade
    string tradeType = "";
    if(dealType == DEAL_TYPE_BUY) tradeType = "BUY";
    else if(dealType == DEAL_TYPE_SELL) tradeType = "SELL";
    else return; // Ignora altri tipi
    
    // Crea JSON payload
    string jsonData = StringFormat(
        "{\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,\"price\":%.5f,\"timestamp\":\"%s\"}",
        symbol, tradeType, volume, price, TimeToString(dealTime, TIME_DATE|TIME_SECONDS)
    );
    
    // Invia a Lantea
    SendTradeToLantea(jsonData);
    
    Print("Trade inviato a Lantea: ", symbol, " ", tradeType, " ", volume, " at ", price);
}

//+------------------------------------------------------------------+
//| Invia trade data a Lantea via HTTP POST                         |
//+------------------------------------------------------------------+
void SendTradeToLantea(string jsonData)
{
    string headers = "Content-Type: application/json\r\n";
    char postData[];
    char result[];
    string resultHeaders;
    
    // Converti JSON in array di char
    StringToCharArray(jsonData, postData, 0, StringLen(jsonData));
    
    // Invia richiesta HTTP POST
    int res = WebRequest(
        "POST",
        ServerURL,
        headers,
        5000, // timeout 5 secondi
        postData,
        result,
        resultHeaders
    );
    
    if(res == 200)
    {
        Print("Trade sincronizzato con successo su Lantea");
    }
    else
    {
        Print("Errore sincronizzazione trade con Lantea: ", res);
    }
}

//+------------------------------------------------------------------+
//| Trade transaction function                                       |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                       const MqlTradeRequest& request,
                       const MqlTradeResult& result)
{
    // Gestione transazioni trade in tempo reale
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD && EnableSync)
    {
        // Nuovo deal aggiunto - potrebbe essere un nuovo trade
        ProcessTransactionDeal(trans);
    }
}

//+------------------------------------------------------------------+
//| Processa deal dalla transazione                                 |
//+------------------------------------------------------------------+
void ProcessTransactionDeal(const MqlTradeTransaction& trans)
{
    ulong dealTicket = trans.deal;
    
    if(HistoryDealSelect(dealTicket))
    {
        ProcessNewTrade(dealTicket);
    }
}