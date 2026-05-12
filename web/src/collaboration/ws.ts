const PING_INTERVAL = 15000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;

export type MessageHandler = (data: Uint8Array) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private currentReconnectDelay = RECONNECT_DELAY;
  private shouldReconnect = true;
  private statusCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.doConnect();
  }

  private doConnect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        this.currentReconnectDelay = RECONNECT_DELAY;
        this.startPing();
        this.notifyStatus(true);
      };

      this.ws.onmessage = (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        for (const handler of this.handlers) {
          handler(data);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        this.stopPing();
        this.notifyStatus(false);
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (err) {
      console.error('Connection error:', err);
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  send(data: Uint8Array): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  onStatus(callback: (connected: boolean) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => { this.statusCallbacks.delete(callback); };
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    console.log(`🔄 Reconnecting in ${this.currentReconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.currentReconnectDelay = Math.min(
        this.currentReconnectDelay * 1.5,
        MAX_RECONNECT_DELAY
      );
      this.doConnect();
    }, this.currentReconnectDelay);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.send(new Uint8Array([255])); // PING message
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private notifyStatus(connected: boolean): void {
    for (const cb of this.statusCallbacks) {
      cb(connected);
    }
  }
}
