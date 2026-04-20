import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

interface HistoryRecord {
  id: number
  contact_name: string
  contact_title: string
  hotel_name: string
  fit_score: number
  email_subject: string
  quality_approved: boolean
  approval_status: string
  created_at: string
}

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_URL}/history`)
        setRecords(response.data)
      } catch {
        console.error('Failed to fetch history')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const statusStyle = (status: string) => {
    if (status === 'approved') return { color: '#10b981', background: '#ecfdf5', border: '1px solid #a7f3d0' }
    if (status === 'rejected') return { color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' }
    return { color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a' }
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-sm" style={{color: '#9ca3af'}}>
      <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{borderColor: '#e5e7eb', borderTopColor: '#6366f1'}} />
      Loading...
    </div>
  )

  const approved = records.filter(r => r.approval_status === 'approved').length
  const avgScore = records.length
    ? Math.round(records.reduce((a, r) => a + r.fit_score, 0) / records.length)
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{color: '#111827'}}>History</h1>
        <p className="text-sm" style={{color: '#6b7280'}}>{records.length} total researches</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total researches', value: records.length, color: '#6366f1' },
          { label: 'Approved', value: approved, color: '#10b981' },
          { label: 'Avg fit score', value: avgScore, color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
            <p className="text-xs font-medium mb-2" style={{color: '#6b7280'}}>{stat.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{color: stat.color}}>{stat.value}</p>
          </div>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl p-16 text-center" style={{background: '#ffffff', border: '1px dashed #e5e7eb'}}>
          <p className="text-sm" style={{color: '#9ca3af'}}>No research history yet</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>

          {/* Header */}
          <div className="grid grid-cols-12 px-5 py-3" style={{borderBottom: '1px solid #f3f4f6', background: '#f9fafb'}}>
            <p className="col-span-3 text-xs font-medium" style={{color: '#6b7280'}}>Contact</p>
            <p className="col-span-4 text-xs font-medium" style={{color: '#6b7280'}}>Subject</p>
            <p className="col-span-2 text-xs font-medium text-center" style={{color: '#6b7280'}}>Score</p>
            <p className="col-span-2 text-xs font-medium text-center" style={{color: '#6b7280'}}>Status</p>
            <p className="col-span-1 text-xs font-medium text-right" style={{color: '#6b7280'}}>Date</p>
          </div>

          {/* Rows */}
          {records.map((record, index) => (
            <div
              key={record.id}
              className="grid grid-cols-12 px-5 py-3.5 items-center transition-colors hover:bg-gray-50"
              style={{borderBottom: index !== records.length - 1 ? '1px solid #f3f4f6' : 'none'}}
            >
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold flex-shrink-0" style={{background: '#eef2ff', color: '#6366f1'}}>
                  {record.contact_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium" style={{color: '#111827'}}>{record.contact_name}</p>
                  <p className="text-[10px] mt-0.5" style={{color: '#9ca3af'}}>{record.hotel_name}</p>
                </div>
              </div>

              <div className="col-span-4 pr-4">
                <p className="text-xs truncate" style={{color: '#6b7280'}}>{record.email_subject}</p>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm font-bold tabular-nums" style={{color: scoreColor(record.fit_score)}}>
                  {record.fit_score}
                </span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={statusStyle(record.approval_status)}>
                  {record.approval_status}
                </span>
              </div>

              <div className="col-span-1 text-right">
                <p className="text-[10px]" style={{color: '#9ca3af'}}>
                  {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}