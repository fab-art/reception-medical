export function pharmacyFromRow(row) {
  return {
    code: row.code,
    name: row.name,
    category: row.category,
    district: row.district,
    province: row.province,
    phone: row.phone,
    poBox: row.po_box,
    email: row.email || '',
  };
}

export function pharmacyToRow(p) {
  return {
    code: p.code,
    name: p.name,
    category: p.category || 'PHARM',
    district: p.district,
    province: p.province,
    phone: p.phone || '',
    po_box: p.poBox || '',
    email: p.email || null,
    updated_at: new Date().toISOString(),
  };
}

export function receptionFromRow(row) {
  return {
    id: row.id,
    receiptNo: row.receipt_no,
    pharmacyCode: row.pharmacy_code,
    pharmacyName: row.pharmacy_name,
    district: row.district,
    province: row.province,
    periodMonth: row.period_month,
    periodYear: row.period_year,
    billNumber: row.bill_number,
    vouchers: row.vouchers,
    amountBilled: Number(row.amount_billed),
    submittedByName: row.submitted_by_name,
    submittedByFunction: row.submitted_by_function,
    receivedByName: row.received_by_name,
    receivedByFunction: row.received_by_function,
    email: row.email,
    receivedAt: row.received_at,
    updatedAt: row.updated_at,
    editedBy: row.edited_by,
    status: row.status,
    assignedOfficerId: row.assigned_officer_id,
    submittedByOfficerId: row.submitted_by_officer_id,
    assignedAt: row.assigned_at,
    verifiedAt: row.verified_at,
    billId: row.bill_id,
    verifiedAmount: row.verified_amount != null ? Number(row.verified_amount) : null,
    difference: row.difference != null ? Number(row.difference) : null,
    amountToPay: row.amount_to_pay != null ? Number(row.amount_to_pay) : null,
    paidAt: row.paid_at,
    paymentId: row.payment_id,
  };
}

export function receptionInsertRow(record) {
  return {
    id: record.id,
    receipt_no: record.receiptNo,
    pharmacy_code: record.pharmacyCode,
    pharmacy_name: record.pharmacyName,
    district: record.district,
    province: record.province,
    period_month: record.periodMonth,
    period_year: record.periodYear,
    bill_number: record.billNumber,
    vouchers: record.vouchers,
    amount_billed: record.amountBilled,
    submitted_by_name: record.submittedByName,
    submitted_by_function: record.submittedByFunction,
    received_by_name: record.receivedByName,
    received_by_function: record.receivedByFunction,
    email: record.email,
    received_at: record.receivedAt,
    submitted_by_officer_id: record.submittedByOfficerId || null,
    status: record.status || 'received',
  };
}

export function receptionUpdateRow(patch) {
  const row = {};
  if ('billNumber' in patch) row.bill_number = patch.billNumber;
  if ('vouchers' in patch) row.vouchers = patch.vouchers;
  if ('amountBilled' in patch) row.amount_billed = patch.amountBilled;
  if ('submittedByName' in patch) row.submitted_by_name = patch.submittedByName;
  if ('submittedByFunction' in patch) row.submitted_by_function = patch.submittedByFunction;
  if ('receivedByName' in patch) row.received_by_name = patch.receivedByName;
  if ('receivedByFunction' in patch) row.received_by_function = patch.receivedByFunction;
  if ('email' in patch) row.email = patch.email;
  return row;
}

export function receptionStatusExtraRow(extra) {
  const row = {};
  if ('verifiedAt' in extra) row.verified_at = extra.verifiedAt;
  if ('billId' in extra) row.bill_id = extra.billId;
  if ('billNumber' in extra) row.bill_number = extra.billNumber;
  if ('verifiedAmount' in extra) row.verified_amount = extra.verifiedAmount;
  if ('difference' in extra) row.difference = extra.difference;
  if ('amountToPay' in extra) row.amount_to_pay = extra.amountToPay;
  if ('paidAt' in extra) row.paid_at = extra.paidAt;
  if ('paymentId' in extra) row.payment_id = extra.paymentId;
  return row;
}

export function officerFromRow(row) {
  return { id: row.id, name: row.name, role: row.role, pin: row.pin, isReceptionist: row.is_receptionist, active: row.active };
}

export function settingsFromRow(row) {
  return {
    branch: row.branch,
    province: row.province,
    district: row.district,
    poBox: row.po_box,
    phone: row.phone,
    receptionistName: row.receptionist_name,
    receptionistFunction: row.receptionist_function,
    receptionPassword: row.reception_password,
    adminPassword: row.admin_password,
    superadminPassword: row.superadmin_password,
  };
}

export function settingsToRow(s) {
  return {
    id: 1,
    branch: s.branch,
    province: s.province,
    district: s.district,
    po_box: s.poBox,
    phone: s.phone,
    receptionist_name: s.receptionistName,
    receptionist_function: s.receptionistFunction,
    reception_password: s.receptionPassword,
    admin_password: s.adminPassword,
    superadmin_password: s.superadminPassword,
  };
}
