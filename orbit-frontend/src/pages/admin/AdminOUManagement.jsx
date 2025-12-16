"use client"

import { useState } from "react"

export default function OUManagement() {
  const [activeTab, setActiveTab] = useState("activated")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOU, setSelectedOU] = useState(null)
  const [expandedOUs, setExpandedOUs] = useState(["1"])
  const [showAddOUModal, setShowAddOUModal] = useState(false)
  const [showAddChildOU, setShowAddChildOU] = useState(false)

  const activatedOUs = [
    {
      id: "1",
      name: "Corporate",
      ouId: "OU001",
      userCount: 245,
      children: [
        { id: "1-1", name: "IT Department", ouId: "OU002", userCount: 45, children: [] },
        { id: "1-2", name: "HR Department", ouId: "OU003", userCount: 32, children: [] },
        {
          id: "1-3",
          name: "Finance",
          ouId: "OU004",
          userCount: 58,
          children: [
            { id: "1-3-1", name: "Accounting", ouId: "OU005", userCount: 28, children: [] },
            { id: "1-3-2", name: "Treasury", ouId: "OU006", userCount: 30, children: [] },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "Operations",
      ouId: "OU007",
      userCount: 178,
      children: [
        { id: "2-1", name: "Logistics", ouId: "OU008", userCount: 67, children: [] },
        { id: "2-2", name: "Warehouse", ouId: "OU009", userCount: 111, children: [] },
      ],
    },
  ]

  const deactivatedOUs = [
    { id: "3", name: "Legacy Systems", ouId: "OU010", userCount: 0, children: [] },
    { id: "4", name: "Old Marketing", ouId: "OU011", userCount: 0, children: [] },
  ]

  const currentOUs = activeTab === "activated" ? activatedOUs : deactivatedOUs

  const toggleOU = (id) => {
    setExpandedOUs((prev) => (prev.includes(id) ? prev.filter((ouId) => ouId !== id) : [...prev, id]))
  }

  const renderOUTree = (ous, level = 0) => {
    return ous.map((ou) => (
      <div key={ou.id}>
        <button
          onClick={() => setSelectedOU(ou)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded transition-colors ${
            selectedOU?.id === ou.id ? "bg-fuchsia-500/20 text-fuchsia-400" : "hover:bg-slate-700/50 text-slate-300"
          }`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
          {ou.children && ou.children.length > 0 && (
            <svg
              onClick={(e) => {
                e.stopPropagation()
                toggleOU(ou.id)
              }}
              className={`w-4 h-4 transition-transform ${expandedOUs.includes(ou.id) ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {(!ou.children || ou.children.length === 0) && <div className="w-4" />}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <span className="text-sm flex-1">{ou.name}</span>
          <span className="text-xs text-slate-400">({ou.userCount})</span>
        </button>
        {expandedOUs.includes(ou.id) && ou.children && renderOUTree(ou.children, level + 1)}
      </div>
    ))
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">OU Management</h1>
            <p className="text-sm text-white/80">Manage organizational units and hierarchy</p>
          </div>
          <button
            onClick={() => setShowAddOUModal(true)}
            className="px-4 py-2 bg-white text-fuchsia-600 rounded-lg font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add OU
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-6 overflow-hidden">
        {/* Left Panel - OU Tree */}
        <div className="w-1/3 bg-slate-800/80 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <input
              type="text"
              placeholder="Search organizational units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setActiveTab("activated")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "activated" ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Activated ({activatedOUs.length})
              {activeTab === "activated" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
            </button>
            <button
              onClick={() => setActiveTab("deactivated")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "deactivated" ? "text-fuchsia-400" : "text-slate-400 hover:text-white"
              }`}
            >
              Deactivated ({deactivatedOUs.length})
              {activeTab === "deactivated" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-fuchsia-500" />}
            </button>
          </div>

          {/* OU Tree */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">{renderOUTree(currentOUs)}</div>
        </div>

        {/* Right Panel - OU Details */}
        <div className="flex-1 bg-slate-800/80 rounded-lg border border-slate-700 flex flex-col overflow-hidden">
          {selectedOU ? (
            <>
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white mb-1">{selectedOU.name}</h2>
                <p className="text-sm text-slate-400">Organizational Unit Details</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">OU Name</label>
                    <p className="text-lg font-semibold text-white">{selectedOU.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">OU ID</label>
                    <p className="text-lg font-semibold text-white">{selectedOU.ouId}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Total Users</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{selectedOU.userCount}</p>
                      <p className="text-sm text-slate-400">Active users in this OU</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors">
                    Edit OU
                  </button>
                  <button className="flex-1 px-4 py-3 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors">
                    Add Child OU
                  </button>
                  <button className="flex-1 px-4 py-3 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors">
                    Deactivate
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-slate-700 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <p className="text-slate-400">Select an organizational unit to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add OU Modal */}
      {showAddOUModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Add New Organizational Unit</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">OU Name</label>
                <input
                  type="text"
                  placeholder="Enter OU name"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Parent OU (Optional)</label>
                <select className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500">
                  <option value="">None (Root Level)</option>
                  <option value="1">Corporate</option>
                  <option value="2">Operations</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addChildOU"
                  checked={showAddChildOU}
                  onChange={(e) => setShowAddChildOU(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500 accent-fuchsia-500"
                />
                <label htmlFor="addChildOU" className="text-sm text-slate-300">
                  Add a child OU immediately
                </label>
              </div>

              {showAddChildOU && (
                <div className="pl-6 border-l-2 border-fuchsia-500/30 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Child OU Name</label>
                    <input
                      type="text"
                      placeholder="Enter child OU name"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddOUModal(false)
                  setShowAddChildOU(false)
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors">
                Create OU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
