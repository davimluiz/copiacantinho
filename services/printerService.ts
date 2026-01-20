import { Order } from '../types';

// Add type definitions for WebUSB
declare global {
  interface Navigator {
    usb: {
      requestDevice(options: { filters: any[] }): Promise<USBDevice>;
    };
  }

  interface USBDevice {
    opened: boolean;
    configuration: {
      interfaces: {
        interfaceNumber: number;
        alternates: {
          endpoints: {
            direction: 'in' | 'out';
            endpointNumber: number;
          }[];
        }[];
      }[];
    } | null;
    open(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: "ok" | "stall" | "babble";
  }
}

// ESC/POS Commands
const ESC = '\x1b';
const GS = '\x1d';
const INIT = ESC + '@';
const CUT = GS + 'V' + '\x41' + '\x00'; // Full cut
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_LEFT = ESC + 'a' + '\x00';
const LF = '\x0a'; // Line feed

export class ThermalPrinterService {
  private device: USBDevice | null = null;
  private interfaceNumber: number = 0;
  private endpointOut: number = 1;

  async connect(): Promise<boolean> {
    try {
      if (!navigator.usb) {
        console.warn("WebUSB not supported");
        return false;
      }

      // Request device - filters empty to allow showing all devices
      this.device = await navigator.usb.requestDevice({ filters: [] });
      
      if (!this.device) return false;

      await this.device.open();
      
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }
      
      const interfaces = this.device.configuration?.interfaces || [];
      for (const iface of interfaces) {
        const claimed = await this.device.claimInterface(iface.interfaceNumber);
        const endpoints = iface.alternates[0].endpoints;
        for (const ep of endpoints) {
            if (ep.direction === 'out') {
                this.interfaceNumber = iface.interfaceNumber;
                this.endpointOut = ep.endpointNumber;
            }
        }
      }

      return true;
    } catch (error) {
      console.error("Printer connection error:", error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  private encode(text: string): Uint8Array {
    const encoder = new TextEncoder();
    const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return encoder.encode(normalized);
  }

  private async send(data: Uint8Array): Promise<void> {
    if (!this.device || !this.device.opened) {
      throw new Error("Printer not connected");
    }
    await this.device.transferOut(this.endpointOut, data);
  }

  async printOrder(order: Order): Promise<void> {
    if (!this.isConnected()) {
        window.print();
        return;
    }

    try {
      let buffer = '';

      // Header
      buffer += INIT;
      buffer += ALIGN_CENTER;
      buffer += BOLD_ON + "CANTINHO DA SANDRA" + BOLD_OFF + LF; // Updated Name
      buffer += "--------------------------------" + LF;
      
      // Date
      const date = new Date(order.createdAt).toLocaleString('pt-BR');
      buffer += ALIGN_LEFT;
      buffer += `Data: ${date}` + LF;
      buffer += `Pedido: #${order.id.slice(-4)}` + LF;
      buffer += "--------------------------------" + LF;

      // Customer
      buffer += BOLD_ON + "CLIENTE" + BOLD_OFF + LF;
      buffer += `Nome: ${order.customer.name}` + LF;
      buffer += `Tel: ${order.customer.phone}` + LF;
      buffer += `End: ${order.customer.address}, ${order.customer.addressNumber}` + LF;
      buffer += `Ref: ${order.customer.reference}` + LF;
      buffer += `Pagamento: ${order.customer.paymentMethod}` + LF;
      buffer += "--------------------------------" + LF;

      // Items
      buffer += BOLD_ON + "ITENS" + BOLD_OFF + LF;
      order.items.forEach(item => {
        const totalItem = (item.price * item.quantity).toFixed(2);
        buffer += `${item.quantity}x ${item.name}` + LF;
        buffer += ALIGN_LEFT + `   R$ ${totalItem}` + LF;
      });
      
      buffer += "--------------------------------" + LF;
      
      // Total
      buffer += ALIGN_CENTER + BOLD_ON + `TOTAL: R$ ${order.total.toFixed(2)}` + BOLD_OFF + LF;
      buffer += LF;
      buffer += "Obrigado pela preferencia!" + LF;
      buffer += LF + LF + LF; // Feed
      buffer += CUT;

      await this.send(this.encode(buffer));

    } catch (e) {
      console.error("Printing failed", e);
      alert("Erro ao imprimir via USB. Tentando impressão do navegador.");
      window.print();
    }
  }
}

export const printerService = new ThermalPrinterService();