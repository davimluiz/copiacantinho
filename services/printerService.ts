
import { Order } from '../types';

// ESC/POS Commands
const ESC = '\x1b';
const GS = '\x1d';
const INIT = ESC + '@';
const CUT = GS + 'V' + '\x41' + '\x00'; 
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_LEFT = ESC + 'a' + '\x00';
const LF = '\x0a';

export class ThermalPrinterService {
  private device: any = null;
  private endpointOut: number = 1;

  async connect(): Promise<boolean> {
    try {
      if (!(navigator as any).usb) return false;
      this.device = await (navigator as any).usb.requestDevice({ filters: [] });
      if (!this.device) return false;
      await this.device.open();
      if (this.device.configuration === null) await this.device.selectConfiguration(1);
      const iface = this.device.configuration?.interfaces[0];
      await this.device.claimInterface(iface.interfaceNumber);
      this.endpointOut = iface.alternates[0].endpoints.find((e: any) => e.direction === 'out').endpointNumber;
      return true;
    } catch (error) {
      console.error("Printer error:", error);
      return false;
    }
  }

  isConnected(): boolean { return this.device !== null && this.device.opened; }

  private encode(text: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  }

  private async send(data: string): Promise<void> {
    if (!this.device) throw new Error("Not connected");
    await this.device.transferOut(this.endpointOut, this.encode(data));
  }

  async printOrder(order: any): Promise<void> {
    if (!this.isConnected()) { window.print(); return; }

    try {
      let b = INIT + ALIGN_CENTER + BOLD_ON + "CANTINHO DA SANDRA" + BOLD_OFF + LF;
      b += "--------------------------------" + LF;
      b += ALIGN_LEFT + `Data: ${new Date().toLocaleString('pt-BR')}` + LF;
      b += `Pedido: #${(order.id || '').slice(-4).toUpperCase()}` + LF;
      b += "--------------------------------" + LF;
      b += BOLD_ON + "CLIENTE" + BOLD_OFF + LF;
      b += `Nome: ${(order.nomeCliente || '').toUpperCase()}` + LF;
      b += `Tel: ${order.telefone || 'N/A'}` + LF;
      b += `Tipo: ${order.tipo || 'N/A'}` + LF;
      if (order.endereco) b += `End: ${order.endereco.toUpperCase()}` + LF;
      b += "--------------------------------" + LF;

      // Reversão para impressão baseada no texto consolidado (itens) para maior estabilidade
      b += (order.itens || 'Sem itens') + LF;

      b += "--------------------------------" + LF;
      if (Number(order.frete || 0) > 0) b += `FRETE: R$ ${Number(order.frete).toFixed(2)}` + LF;
      b += ALIGN_CENTER + BOLD_ON + `TOTAL: R$ ${Number(order.total || 0).toFixed(2)}` + BOLD_OFF + LF;
      b += `PAGAMENTO: ${order.pagamento || 'N/A'}` + LF;
      b += LF + LF + LF + CUT;

      await this.send(b);
    } catch (e) {
      console.error(e);
      window.print();
    }
  }
}

export const printerService = new ThermalPrinterService();
