import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const API_URL = 'http://localhost:8000'

interface HistoryRecord {
  id: number
  contact_name: string
  hotel_name: string
  fit_score: number
  approval_status: string
  created_at: string
}

export default function Analytics() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_URL}/history`)
        setRecords(res.data)
      } catch {
        console.error('Failed')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 text-sm" style={{color: '#9ca3af'}}>
      <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{borderColor: '#e5e7eb', borderTopColor: '#6366f1'}} />
      Loading...
    </div>
  )

  // Calculations
  const total = records.length
  const approved = records.filter(r => r.approval_status === 'approved').length
  const rejected = records.filter(r => r.approval_status === 'rejected').length
  const pending = records.filter(r => r.approval_status === 'pending').length
  const avgScore = total ? Math.round(records.reduce((a, r) => a + r.fit_score, 0) / total) : 0
  const approvalRate = total ? Math.round((approved / total) * 100) : 0

  // Score distribution
  const scoreRanges = [
    { range: '90-100', count: records.filter(r => r.fit_score >= 90).length },
    { range: '80-89', count: records.filter(r => r.fit_score >= 80 && r.fit_score < 90).length },
    { range: '70-79', count: records.filter(r => r.fit_score >= 70 && r.fit_score < 80).length },
    { range: '60-69', count: records.filter(r => r.fit_score >= 60 && r.fit_score < 70).length },
    { range: '<60', count: records.filter(r => r.fit_score < 60).length },
  ]

  // Status breakdown for pie chart
  const statusData = [
    { name: 'Approved', value: approved, color: '#10b981' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
    { name: 'Rejected', value: rejected, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Activity over time (last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const count = records.filter(r => {
      const rd = new Date(r.created_at)
      return rd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr
    }).length
    return { date: dateStr, count }
  })

  const statCards = [
    { label: 'Total researches', value: total, color: '#6366f1' },
    { label: 'Approved', value: approved, color: '#10b981' },
    { label: 'Avg fit score', value: avgScore, color: '#f59e0b' },
    { label: 'Approval rate', value: `${approvalRate}%`, color: '#6366f1' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-1" style={{color: '#111827'}}>Analytics</h1>
        <p className="text-sm" style={{color: '#6b7280'}}>Performance overview across all researches.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, i) => (
          <div key={i} className="rounded-xl p-4" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
            <p className="text-xs font-medium mb-2" style={{color: '#6b7280'}}>{stat.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{color: stat.color}}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">

        {/* Activity chart */}
        <div className="col-span-2 rounded-xl p-5" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
          <p className="text-sm font-medium mb-4" style={{color: '#111827'}}>Activity — last 7 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days} barSize={24}>
              <XAxis dataKey="date" tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12}}
                cursor={{fill: '#f3f4f6'}}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Researches" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="rounded-xl p-5" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
          <p className="text-sm font-medium mb-4" style={{color: '#111827'}}>Status breakdown</p>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12}}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{background: d.color}} />
                      <span className="text-xs" style={{color: '#6b7280'}}>{d.name}</span>
                    </div>
                    <span className="text-xs font-medium" style={{color: '#111827'}}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center pt-8" style={{color: '#9ca3af'}}>No data yet</p>
          )}
        </div>
      </div>

      {/* Score distribution */}
      <div className="rounded-xl p-5" style={{background: '#ffffff', border: '1px solid #e5e7eb'}}>
        <p className="text-sm font-medium mb-4" style={{color: '#111827'}}>Score distribution</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={scoreRanges} barSize={40}>
            <XAxis dataKey="range" tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 11, fill: '#9ca3af'}} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12}}
              cursor={{fill: '#f3f4f6'}}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Contacts">
              {scoreRanges.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#10b981' : i === 1 ? '#6366f1' : i === 2 ? '#f59e0b' : '#f97316'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}