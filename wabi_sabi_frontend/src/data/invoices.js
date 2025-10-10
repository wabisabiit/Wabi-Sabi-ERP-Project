// src/data/invoices.js

export const INVOICE_ROWS = [
  { no:"INV898", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands loot – Krishna Nagar –", net:4479.98, paid:0, due:4479.98, status:"INVOICED", payStatus:"DUE", tax:213.34, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV897", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Rajouri Garden – Inside –", net:14799.99, paid:0, due:14799.99, status:"INVOICED", payStatus:"DUE", tax:704.76, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV896", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:15599.98, paid:0, due:15599.98, status:"INVOICED", payStatus:"DUE", tax:742.85, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV895", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:12799.99, paid:0, due:12799.99, status:"INVOICED", payStatus:"DUE", tax:609.52, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV894", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:2540.00, paid:0, due:2540.00, status:"INVOICED", payStatus:"DUE", tax:120.95, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV893", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:2500.00, paid:0, due:2500.00, status:"INVOICED", payStatus:"DUE", tax:119.05, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV892", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Rajouri Garden – Inside –", net:13839.99, paid:0, due:13839.99, status:"INVOICED", payStatus:"DUE", tax:787.61, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV891", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Rajouri Garden – Outside –", net:2460.00, paid:0, due:2460.00, status:"INVOICED", payStatus:"DUE", tax:117.14, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV890", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:16039.99, paid:0, due:16039.99, status:"INVOICED", payStatus:"DUE", tax:956.66, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV889", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:5500.01, paid:0, due:5500.01, status:"INVOICED", payStatus:"DUE", tax:261.90, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
];

/* find one row by invoice no */
export const findInvoiceRow = (no) =>
  INVOICE_ROWS.find(r => String(r.no).toUpperCase() === String(no).toUpperCase());

/* build a full detail object from a list row */
export function buildInvoiceDetail(row){
  const LINES = 20;
  const net = Number(row.net||0);
  const totalTax = Number(row.tax||0);
  const perTotal = +(net/LINES).toFixed(2);
  const perTax = +(totalTax/LINES).toFixed(2);
  const perTaxable = +(perTotal - perTax).toFixed(2);

  const items = Array.from({length:LINES}).map((_,i)=>({
    idx:i+1,
    itemCode:100754+i,
    itemName:"(152) (L) Plain Shirt",
    batch:"B35130"+(500000000+i),
    qty:1, free:0,
    price:perTaxable, taxable:perTaxable, tax:perTax, total:perTotal,
    dis1:0, dis2:0
  }));
  const taxAmount = +(items.reduce((a,r)=>a+r.tax,0)).toFixed(2);
  const address = "J-1/61, RAJORI GARDEN, New Delhi West Delhi – 110027 Delhi India";
  const gstin = "07AADFW9945P1Z6";

  return {
    meta:{
      invoiceNo:row.no, invoiceDate:row.invDate, dueDate:row.dueDate,
      paymentTerm:"N/A", exportSez:"No", reverseCharge:"No", paymentReminder:"No",
      accountLedger:"Sales", createdBy:row.createdBy, createdTime:`${row.invDate} 10:01:57 AM`,
      status:row.status, paymentStatus:row.payStatus,
      dueAmount:row.due.toFixed(2), paidAmount:row.paid.toFixed(2), totalAmount:row.net.toFixed(2),
      taxAmount:taxAmount.toFixed(2),
    },
    party:{
      name:row.customer, placeOfSupply:"Delhi",
      billing:{ line1:row.customer.replace(/ –+$/,""), line2:address, gstin, phone:"+91-9599883461" },
      shipping:{ line1:row.customer.replace(/ –+$/,""), line2:address, gstin, phone:"Mobile no. is not provided" },
    },
    items,
    addlCharges:[],
    summary:{
      flatDiscountPct:"0.00 %",
      grossAmount:(net - taxAmount).toFixed(2),
      discount:"-0.00",
      taxableAmount:(net - taxAmount).toFixed(2),
      taxAmount:taxAmount.toFixed(2),
      roundoff:"0.00",
      netAmount:net.toFixed(2),
    },
  };
}
