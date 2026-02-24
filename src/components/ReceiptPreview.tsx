import { Receipt, ReceiptSettings } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { formatCurrency } from '../utils/format';

interface ReceiptPreviewProps {
  receipt: Receipt;
  settings: ReceiptSettings;
  type?: 'customer' | 'merchant' | 'kitchen';
}

export default function ReceiptPreview({ receipt, settings, type = 'customer' }: ReceiptPreviewProps) {
  const isKitchen = type === 'kitchen';
  const isMerchant = type === 'merchant';

  const fontSizeClass = {
    small: 'text-[10px]',
    medium: 'text-[12px]',
    large: 'text-[14px]'
  }[settings.font_size];

  return (
    <div className={`bg-white p-8 w-[300px] mx-auto shadow-inner font-mono text-black ${fontSizeClass} leading-tight`}>
      {/* Header */}
      {!isKitchen && (
        <div className="text-center space-y-1 mb-6">
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="w-12 h-12 mx-auto mb-2 object-contain" />
          )}
          <h1 className="text-lg font-bold uppercase tracking-widest">{settings.business_name}</h1>
          <p className="font-bold">{settings.branch_name}</p>
          <p>{settings.address}</p>
          <p>{settings.phone}</p>
          {settings.show_tax === 1 && <p>Tax ID: {settings.tax_id}</p>}
        </div>
      )}

      {isKitchen && (
        <div className="text-center mb-4 border-b-2 border-dashed border-black pb-4">
          <h1 className="text-2xl font-black uppercase">KITCHEN COPY</h1>
          <p className="text-lg font-bold">Order #{receipt.order_id}</p>
        </div>
      )}

      {/* Meta Info */}
      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{new Date(receipt.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Time:</span>
          <span>{new Date(receipt.created_at).toLocaleTimeString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Receipt:</span>
          <span className="truncate ml-4">#{receipt.id.slice(0, 8)}</span>
        </div>
        {settings.show_cashier === 1 && (
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{receipt.cashier_name}</span>
          </div>
        )}
      </div>

      <div className="border-b border-dashed border-black mb-4"></div>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {receipt.items.map((item) => (
          <div key={item.id}>
            <div className="flex justify-between font-bold">
              <span className={isKitchen ? 'text-lg' : ''}>
                {item.quantity}x {item.name}
              </span>
              {!isKitchen && <span>{formatCurrency(item.price * item.quantity)}</span>}
            </div>
            {settings.show_sku === 1 && !isKitchen && (
              <p className="text-[10px] text-gray-500">{item.sku}</p>
            )}
          </div>
        ))}
      </div>

      {!isKitchen && (
        <>
          <div className="border-b border-dashed border-black mb-4"></div>

          {/* Summary */}
          <div className="space-y-1 mb-6">
            {receipt.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(receipt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black pt-2">
              <span>TOTAL</span>
              <span>{formatCurrency(receipt.total)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-black mb-6"></div>

          {/* Payment Info */}
          <div className="mb-6">
            <p className="font-bold uppercase mb-1">Payment Method</p>
            <div className="flex justify-between">
              <span className="capitalize">{receipt.payment_method}</span>
              <span>{formatCurrency(receipt.total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center gap-2">
              <QRCodeSVG 
                value={`https://cloudpos.app/r/${receipt.id}`} 
                size={80}
                level="L"
                includeMargin={false}
              />
              <p className="text-[10px] text-gray-400">Scan to verify receipt</p>
            </div>
            
            <div className="space-y-1">
              <p className="font-bold uppercase">{settings.footer_message}</p>
              <p className="text-[10px] italic">{settings.return_policy}</p>
            </div>

            {isMerchant && (
              <div className="mt-8 pt-4 border-t border-black">
                <p className="font-black text-xs">MERCHANT COPY</p>
                <p className="text-[10px] mt-2 italic">Internal Use Only</p>
              </div>
            )}
          </div>
        </>
      )}

      {isKitchen && (
        <div className="mt-8 pt-4 border-t-2 border-dashed border-black">
          <p className="text-center font-bold">END OF ORDER</p>
        </div>
      )}
    </div>
  );
}
