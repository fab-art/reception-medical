import { useEffect, useState } from 'react';
import { Card, Button, Field, inputCls } from '../components/UI';
import WorkflowBadge from '../components/WorkflowBadge';
import { Timeline, PipelineStepper } from '../components/Timeline';
import { formatMoney } from '../lib/utils';
import { VERIFICATION_DELAY_REASONS, RECONCILIATION_DELAY_REASONS } from '../lib/workflow';
import { getInvoiceEvents, startVerification, returnForRectification, resumeVerification, completeVerification,
  startReconciliation, completeReconciliation, dispatchToHq, confirmReceivedAtHq, sendToLead, leadApprove, leadReturn,
  managerApprove, managerReturn, resubmitAfterCorrection, markPayslipGenerated, markPaymentOrderIssued, markFacilityPaid,
  assignToAssistant, unassignAssistant } from '../lib/db';
import { useToast } from '../lib/toast';
import { makeQrDataUrl } from '../lib/qr';

const ROW = 'grid grid-cols-2 gap-x-4 gap-y-2 text-sm';
const LBL = 'text-gray-400 text-xs';

function Fact({ label, value }) {
  return <div><div className={LBL}>{label}</div><div className="font-medium text-gray-800">{value ?? '—'}</div></div>;
}

export default function InvoiceWorkspace({ record, session, officers = [], onClose, onChanged }) {
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const actor = session.officerName || session.role;

  useEffect(() => { getInvoiceEvents(record.id).then(setEvents); }, [record.id, record.updatedAt]);

  async function run(fn, okMessage) {
    setBusy(true);
    try {
      await fn();
      toast(okMessage);
      await onChanged?.();
    } catch (e) {
      toast(e.message || 'Something went wrong.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const s = record.status;
  const isMine = record.assignedOfficerId === session.officerId || record.assignedAssistantId === session.officerId;
  const canVerify = (session.role === 'district_officer' || session.role === 'hq_assistant') && isMine;
  const assistants = officers.filter((o) => o.role === 'hq_assistant');

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-xl md:text-2xl font-medium text-rssb-blue-dark">{record.receiptNo}</h1>
            <WorkflowBadge status={s} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{record.facilityName} · {record.district} · {record.periodMonth}</p>
          {record.billingId && <p className="text-xs text-gray-400 mt-0.5 font-mono">Billing ID: {record.billingId}</p>}
        </div>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      <Card className="p-4 mb-4"><PipelineStepper status={s} /></Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">Invoice details</h2>
            <div className={ROW}>
              <Fact label="Facility code" value={record.facilityCode} />
              <Fact label="Category" value={record.category} />
              <Fact label="Amount billed" value={formatMoney(record.amountBilled) + ' RWF'} />
              <Fact label="Vouchers" value={record.vouchers} />
              <Fact label="Submitted to district" value={record.submittedAt && new Date(record.submittedAt).toLocaleDateString()} />
              <Fact label="Verification officer" value={record.assignedOfficerName} />
              {record.amountAfterVerification != null && <Fact label="Amount after verification" value={formatMoney(record.amountAfterVerification) + ' RWF'} />}
              {record.deductionAmount != null && <Fact label="Deduction" value={formatMoney(record.deductionAmount) + ' RWF'} />}
            </div>
            {record.notes && <div className="mt-3 pt-3 border-t text-sm"><span className={LBL}>Notes</span><p className="mt-0.5">{record.notes}</p></div>}
          </Card>

          <ActionPanel
            record={record} session={session} canVerify={canVerify} run={run} busy={busy}
            actor={actor}
          />

          <Card className="p-5">
            <h2 className="font-semibold text-sm text-gray-700 mb-3">Invoice journey</h2>
            <Timeline events={events} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5 text-sm">
            <h2 className="font-semibold text-gray-700 mb-3">Assignment</h2>
            <div className="space-y-2">
              <Fact label="District officer" value={record.assignedOfficerName || 'Unassigned'} />
              <Fact label="HQ assistant" value={officers.find((o) => o.id === record.assignedAssistantId)?.name || 'None'} />
            </div>
            {['lead_medical_officer', 'manager', 'zone_supervisor', 'admin', 'superadmin'].includes(session.role) && (
              <div className="mt-3 pt-3 border-t">
                <Field label="Assign to HQ assistant">
                  <select
                    className={inputCls}
                    value={record.assignedAssistantId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const a = assistants.find((x) => x.id === val);
                      if (val) run(() => assignToAssistant(record.id, val, a.name, actor), `Assigned to ${a.name}.`);
                      else run(() => unassignAssistant(record.id, actor), 'Assistant unassigned.');
                    }}
                  >
                    <option value="">Unassigned</option>
                    {assistants.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </Card>

          {record.transitQrCode && (
            <Card className="p-5 text-center">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm text-left">Transit QR code</h2>
              <QrPanel invoiceId={record.id} />
              <p className="text-xs text-gray-400 mt-2">Scanned on pickup and again on arrival at HQ to confirm the hard copies moved with this record.</p>
            </Card>
          )}

          {record.correctionCount > 0 && (
            <Card className="p-4 text-sm bg-amber-50 border-amber-200">
              <div className="font-medium text-amber-800">{record.correctionCount} correction round{record.correctionCount > 1 ? 's' : ''}</div>
              {record.returnReason && <div className="text-amber-700 mt-1">{record.returnReason}</div>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function QrPanel({ invoiceId }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { makeQrDataUrl(invoiceId).then(setUrl); }, [invoiceId]);
  return url ? <img src={url} alt="Transit QR" className="mx-auto rounded-lg border" width={140} height={140} /> : <div className="h-[140px] flex items-center justify-center text-xs text-gray-400">Generating…</div>;
}

function ActionPanel({ record, session, canVerify, run, busy, actor }) {
  const [billingId, setBillingId] = useState('');
  const [vouchersDone, setVouchersDone] = useState(record.vouchersDone || record.vouchers || '');
  const [amountAfter, setAmountAfter] = useState(record.amountAfterVerification ?? record.amountBilled ?? '');
  const [reason, setReason] = useState('');
  const [payslipNo, setPayslipNo] = useState('');
  const s = record.status;

  const box = (title, body) => (
    <Card className="p-5">
      <h2 className="font-semibold text-sm text-gray-700 mb-3">{title}</h2>
      {body}
    </Card>
  );

  if (canVerify && s === 'awaiting_verification') return box('Start verification', (
    <div className="flex gap-2 items-end">
      <Field label="Billing ID (from Finance system)" className="flex-1">
        <input className={inputCls} value={billingId} onChange={(e) => setBillingId(e.target.value)} placeholder="e.g. BIL-GAS-10234" />
      </Field>
      <Button disabled={busy || !billingId.trim()} onClick={() => run(() => startVerification(record.id, billingId.trim(), actor), 'Verification started.')}>Start</Button>
    </div>
  ));

  if (canVerify && s === 'verification_ongoing') return box('Verification in progress', (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vouchers verified"><input type="number" className={inputCls} value={vouchersDone} onChange={(e) => setVouchersDone(e.target.value)} /></Field>
        <Field label="Amount after verification (RWF)"><input type="number" className={inputCls} value={amountAfter} onChange={(e) => setAmountAfter(e.target.value)} /></Field>
      </div>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => run(() => completeVerification(record.id, { vouchersDone, amountAfterVerification: amountAfter }, actor), 'Verification completed.')}>Complete verification</Button>
      </div>
      <div className="pt-3 border-t">
        <Field label="Return for rectification">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason…</option>
            {VERIFICATION_DELAY_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Button variant="secondary" className="mt-2" disabled={busy || !reason} onClick={() => run(() => returnForRectification(record.id, reason, actor), 'Sent back for rectification.')}>Return for rectification</Button>
      </div>
    </div>
  ));

  if (canVerify && s === 'awaiting_rectification') return box('Awaiting rectification', (
    <div>
      {record.verificationDelayReason && <p className="text-sm text-amber-700 mb-3">{record.verificationDelayReason}</p>}
      <Button disabled={busy} onClick={() => run(() => resumeVerification(record.id, actor), 'Verification resumed.')}>Resume verification</Button>
    </div>
  ));

  if (canVerify && s === 'verification_complete') return box('Reconciliation', (
    <div><p className="text-sm text-gray-500 mb-3">Invite the facility to reconcile the verification output.</p>
      <Button disabled={busy} onClick={() => run(() => startReconciliation(record.id, actor), 'Reconciliation started.')}>Start reconciliation</Button>
    </div>
  ));

  if (canVerify && s === 'reconciliation_ongoing') return box('Reconciliation in progress', (
    <div className="space-y-3">
      <Button disabled={busy} onClick={() => run(() => completeReconciliation(record.id, actor), 'Reconciliation completed.')}>Facility agreed — close reconciliation</Button>
      <div className="pt-3 border-t">
        <Field label="Reconciliation delay reason (optional)">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">—</option>
            {RECONCILIATION_DELAY_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>
    </div>
  ));

  if (canVerify && s === 'reconciliation_complete') return box('Ready for HQ', (
    <div><p className="text-sm text-gray-500 mb-3">Dispatch the hard-copy invoice and vouchers to HQ. A QR code will be generated for the courier.</p>
      <Button disabled={busy} onClick={() => run(() => dispatchToHq(record.id, actor), 'Dispatched to HQ — QR code generated.')}>Dispatch to HQ</Button>
    </div>
  ));

  if (session.role === 'hq_reception' && s === 'in_transit_to_hq') return box('Confirm arrival', (
    <div><p className="text-sm text-gray-500 mb-3">Scan the transit QR code on arrival to confirm the hard copies were received and archived.</p>
      <Button disabled={busy} onClick={() => run(() => confirmReceivedAtHq(record.id, actor), 'Marked received and archived at HQ.')}>Confirm received at HQ</Button>
    </div>
  ));

  if (session.role === 'hq_reception' && s === 'received_at_hq') return box('Forward to Lead Medical Officer', (
    <Button disabled={busy} onClick={() => run(() => sendToLead(record.id, actor), 'Forwarded to the Lead Medical Officer.')}>Forward to Lead</Button>
  ));

  if (session.role === 'lead_medical_officer' && (s === 'received_at_hq' || s === 'lead_review')) return box('Lead Medical Officer review', (
    <div className="space-y-3">
      <Field label="Comment (optional)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => run(() => leadApprove(record.id, reason, actor), 'Approved and forwarded to the Manager.')}>Approve for payment</Button>
        <Button variant="danger" disabled={busy || !reason} onClick={() => run(() => leadReturn(record.id, reason || 'Improper verification', actor), 'Returned to the officer.')}>Return</Button>
      </div>
    </div>
  ));

  if (session.role === 'manager' && s === 'manager_review') return box('Manager sign-off', (
    <div className="space-y-3">
      <Field label="Comment (optional)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Button disabled={busy} onClick={() => run(() => managerApprove(record.id, reason, actor), 'Signed. Sent to Finance.')}>Sign & approve</Button>
        <Button variant="danger" disabled={busy || !reason} onClick={() => run(() => managerReturn(record.id, reason || 'Needs review', actor), 'Returned to Lead.')}>Return</Button>
      </div>
    </div>
  ));

  if (['returned_by_lead', 'returned_by_manager'].includes(s) && canVerify) return box('Corrections needed', (
    <div>
      <p className="text-sm text-rose-700 mb-3">{record.leadComment || record.managerComment || 'Corrections requested.'}</p>
      <Button disabled={busy} onClick={() => run(() => resubmitAfterCorrection(record.id, actor), 'Resubmitted.')}>Resubmit after correction</Button>
    </div>
  ));

  if (session.role === 'finance' && s === 'sent_to_finance') return box('Generate payslip', (
    <div className="flex gap-2 items-end">
      <Field label="Payslip number" className="flex-1"><input className={inputCls} value={payslipNo} onChange={(e) => setPayslipNo(e.target.value)} /></Field>
      <Button disabled={busy || !payslipNo.trim()} onClick={() => run(() => markPayslipGenerated(record.id, payslipNo.trim(), actor), 'Payslip generated.')}>Generate</Button>
    </div>
  ));
  if (session.role === 'finance' && s === 'payslip_generated') return box('Payment order', (
    <Button disabled={busy} onClick={() => run(() => markPaymentOrderIssued(record.id, actor), 'Payment order issued.')}>Issue payment order (OP)</Button>
  ));
  if (session.role === 'finance' && s === 'payment_order_issued') return box('Finalize payment', (
    <Button disabled={busy} onClick={() => run(() => markFacilityPaid(record.id, actor), 'Facility marked as paid.')}>Mark facility paid</Button>
  ));

  return null;
}
