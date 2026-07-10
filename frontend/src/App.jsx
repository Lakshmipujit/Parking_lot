import { useEffect, useState, useCallback } from 'react';
import './App.css';

const TYPE_LABELS = { bike: 'Bike', car: 'Car', truck: 'Truck' };

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [slots, setSlots] = useState(null);
  const [parked, setParked] = useState([]);
  const [lastTicket, setLastTicket] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const [parkForm, setParkForm] = useState({ vehicleNumber: '', vehicleType: 'car' });
  const [exitForm, setExitForm] = useState({ identifier: '' });

  const [parkLoading, setParkLoading] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'error'|'success', text }
  const API_URL = "https://parking-backend-v1sj.onrender.com";
  const loadSlots = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/slots`);
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      setBanner({ type: 'error', text: 'Could not reach the server for slot availability.' });
    }
  }, []);

  const loadParked = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/parked`);
      const data = await res.json();
      setParked(data);
    } catch (err) {
      setBanner({ type: 'error', text: 'Could not reach the server for the parked list.' });
    }
  }, []);

  useEffect(() => {
    loadSlots();
    loadParked();
  }, [loadSlots, loadParked]);

  async function handlePark(e) {
    e.preventDefault();
    setBanner(null);
    setReceipt(null);

    if (!parkForm.vehicleNumber.trim()) {
      setBanner({ type: 'error', text: 'Enter a vehicle number before generating a ticket.' });
      return;
    }

    setParkLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/park`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parkForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', text: data.message || 'Could not park the vehicle.' });
        return;
      }

      setLastTicket(data.ticket);
      setParkForm({ vehicleNumber: '', vehicleType: parkForm.vehicleType });
      setBanner({ type: 'success', text: `Ticket ${data.ticket.ticketId} issued.` });
      loadSlots();
      loadParked();
    } catch (err) {
      setBanner({ type: 'error', text: 'Network error while parking the vehicle.' });
    } finally {
      setParkLoading(false);
    }
  }

  async function handleExit(e) {
    e.preventDefault();
    setBanner(null);

    const identifier = exitForm.identifier.trim();
    if (!identifier) {
      setBanner({ type: 'error', text: 'Enter a ticket ID or vehicle number to exit.' });
      return;
    }

    // A ticket ID looks like TKT-1001; anything else is treated as a vehicle number.
    const isTicketId = /^TKT-/i.test(identifier);
    const body = isTicketId ? { ticketId: identifier } : { vehicleNumber: identifier };

    setExitLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', text: data.message || 'Could not exit the vehicle.' });
        setReceipt(null);
        return;
      }

      setReceipt(data.receipt);
      setExitForm({ identifier: '' });
      loadSlots();
      loadParked();
    } catch (err) {
      setBanner({ type: 'error', text: 'Network error while exiting the vehicle.' });
    } finally {
      setExitLoading(false);
    }
  }

  const totalSlots = slots
    ? Object.values(slots).reduce((sum, s) => sum + s.total, 0)
    : 0;
  const occupiedSlots = slots
    ? Object.values(slots).reduce((sum, s) => sum + (s.total - s.available), 0)
    : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-title-block">
          <div>
            <h1>
              GATE<span className="barred">HOUSE</span>
            </h1>
            <p>Parking lot management</p>
          </div>
        </div>
        <div className="header-occupancy">
          <div className="big">
            {occupiedSlots} / {totalSlots}
          </div>
          <div className="label">Slots occupied</div>
        </div>
      </header>

      <main className="content">
        {banner && <div className={`banner ${banner.type}`}>{banner.text}</div>}

        <section className="slots-grid">
          {slots &&
            Object.entries(slots).map(([type, info]) => {
              const pct = info.total > 0 ? ((info.total - info.available) / info.total) * 100 : 0;
              const isFull = info.available === 0;
              return (
                <div key={type} className={`slot-card ${isFull ? 'full' : ''}`}>
                  <div className="slot-card-head">
                    <span className="slot-type">
                      <span className={`dot ${type}`} />
                      {TYPE_LABELS[type]}
                    </span>
                    {isFull && <span className="full-pill">Full</span>}
                  </div>
                  <div className="slot-count">
                    {info.available}
                    <span>/ {info.total} free</span>
                  </div>
                  <div className="slot-bar-track">
                    <div className={`slot-bar-fill ${type}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </section>

        <section className="forms-grid">
          <form className="panel" onSubmit={handlePark}>
            <div className="panel-head">
              <h2>Park a vehicle</h2>
              <p>Generates a ticket</p>
            </div>
            <div className="field">
              <label htmlFor="vehicleNumber">Vehicle number</label>
              <input
                id="vehicleNumber"
                type="text"
                placeholder="KA01AB1234"
                value={parkForm.vehicleNumber}
                onChange={(e) => setParkForm({ ...parkForm, vehicleNumber: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="vehicleType">Vehicle type</label>
              <select
                id="vehicleType"
                value={parkForm.vehicleType}
                onChange={(e) => setParkForm({ ...parkForm, vehicleType: e.target.value })}
              >
                <option value="bike">Bike</option>
                <option value="car">Car</option>
                <option value="truck">Truck</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={parkLoading}>
              {parkLoading ? 'Generating…' : 'Generate ticket'}
            </button>
          </form>

          <form className="panel" onSubmit={handleExit}>
            <div className="panel-head">
              <h2>Exit a vehicle</h2>
              <p>Calculates the fare</p>
            </div>
            <div className="field">
              <label htmlFor="identifier">Ticket ID or vehicle number</label>
              <input
                id="identifier"
                type="text"
                placeholder="TKT-1001"
                value={exitForm.identifier}
                onChange={(e) => setExitForm({ identifier: e.target.value })}
              />
            </div>
            <button className="btn btn-accent" type="submit" disabled={exitLoading}>
              {exitLoading ? 'Calculating…' : 'Exit and calculate fare'}
            </button>

            {receipt && (
              <div className="exit-result">
                <div style={{ flex: 1 }}>
                  <div className="row">
                    <span>Duration</span>
                    <strong>{receipt.durationHours} hour{receipt.durationHours === 1 ? '' : 's'}</strong>
                  </div>
                  <div className="row">
                    <span>Amount due</span>
                    <span className="amount">₹{receipt.amount}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </section>

        {lastTicket && (
          <section className="ticket-wrap">
            <div className="ticket-stub">
              <div className="ticket-top">
                <div>
                  <div className="ticket-eyebrow">Sample ticket</div>
                  <div className="ticket-id">{lastTicket.ticketId}</div>
                </div>
              </div>
              <div className="ticket-grid">
                <div className="ticket-field">
                  <div className="k">Vehicle</div>
                  <div className="v">{lastTicket.vehicleNumber}</div>
                </div>
                <div className="ticket-field">
                  <div className="k">Type</div>
                  <div className="v">{TYPE_LABELS[lastTicket.vehicleType]}</div>
                </div>
                <div className="ticket-field">
                  <div className="k">Entry time</div>
                  <div className="v">{formatTime(lastTicket.entryTime)}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="table-panel">
          <div className="panel-head">
            <h2>Currently parked</h2>
          </div>
          {parked.length === 0 ? (
            <div className="empty-state">No vehicles parked right now.</div>
          ) : (
            <table className="parked-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Vehicle no.</th>
                  <th>Type</th>
                  <th>Entry time</th>
                </tr>
              </thead>
              <tbody>
                {parked.map((v) => (
                  <tr key={v.ticketId}>
                    <td>{v.ticketId}</td>
                    <td>{v.vehicleNumber}</td>
                    <td>
                      <span className="type-tag">
                        <span className={`dot ${v.vehicleType}`} />
                        {TYPE_LABELS[v.vehicleType]}
                      </span>
                    </td>
                    <td>{formatTime(v.entryTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
