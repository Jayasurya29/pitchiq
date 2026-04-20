import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

interface PendingRecord {
  id: number
  contact_name: string
  contact_title: string
  hotel_name: string
  fit_score: number
  email_subject: string
  email_body: string
  linkedin_message: string
  approval_status: string
  created_at: string
}

export default function Pending() {
  const [records, setRecords] = useState<PendingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const fetchPending = async () => {
    try {
      const response = await axios.get(`${API_URL}/pending`)
      setRecords(response.data)
    } catch {
      console.error('Failed to fetch pending')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  const handleApprove = async (id: number) => {
    setActionLoading(id)
    try {
      await axios.post(`${API_URL}/approve/${id}`)
      fetchPending()
    } catch {
      console.error('Failed to approve')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: number) => {
    setActionLoading(id)
    try {
      await axios.post(`${API_URL}/reject/${id}`)
      fetchPending()
    } catch {
      console.error('Failed to reject')
    } finally {
      setActionLoading(null)
    }
  }

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm" style={{color: '#9ca3af'}}>
      <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{borderColor: '#e5e7eb', borderTopColor: '#6366f1'}} />
      Loading...
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{color: '#111827'}}>Pending approval</h1>
        <p className="text-sm" style={{color: '#6b7280'}}>
          {records.length === 0
            ? 'All caught up — no emails waiting.'
            : `${records.length} email${records.length !== 1 ? 's' : ''} waiting for your review.`}
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl p-16 text-center" style={{background: '#ffffff', border: '1px dashed #e5e7eb'}}>
          <p className="text-sm" style={{color: '#9ca3af'}}>No pending emails</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(record => (
            <div key={record.id} className="rounded-xl overflow-hidden" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>

              {/* Row */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors"
                style={{}}
                onClick={() => setExpanded(expanded === record.id ? null : record.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold" style={{background: '#eef2ff', color: '#6366f1'}}>
                    {record.contact_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{color: '#111827'}}>
                      {record.contact_name}
                      <span style={{color: '#6b7280', fontWeight: 400}}> · {record.contact_title}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{color: '#9ca3af'}}>{record.hotel_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums" style={{color: scoreColor(record.fit_score)}}>
                    {record.fit_score}
                  </span>
                  <span className="text-xs" style={{color: '#d1d5db'}}>
                    {expanded === record.id ? '↑' : '↓'}
                  </span>
                </div>
              </div>

              {/* Expanded */}
              {expanded === record.id && (
                <div className="px-5 py-4 space-y-4" style={{borderTop: '1px solid #f3f4f6'}}>

                  <div>
                    <p className="text-xs font-medium mb-2" style={{color: '#374151'}}>Email</p>
                    <p className="text-xs font-medium mb-2 pb-2" style={{color: '#6b7280', borderBottom: '1px solid #f3f4f6'}}>
                      {record.email_subject}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{color: '#4b5563'}}>
                      {record.email_body}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium mb-2" style={{color: '#374151'}}>LinkedIn</p>
                    <p className="text-sm leading-relaxed" style={{color: '#4b5563'}}>
                      {record.linkedin_message}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(record.id)}
                      disabled={actionLoading === record.id}
                      className="flex-1 text-white text-sm font-medium py-2.5 rounded-lg transition-all disabled:opacity-40"
                      style={{background: '#6366f1'}}
                    >
                      {actionLoading === record.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </span>
                      ) : 'Approve & send →'}
                    </button>
                    <button
                      onClick={() => handleReject(record.id)}
                      disabled={actionLoading === record.id}
                      className="px-5 text-sm py-2.5 rounded-lg transition-all disabled:opacity-40"
                      style={{background: '#f9fafb', border: '1px solid #e5e7eb', color: '#6b7280'}}
                    >
                      Reject
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}