import { useState } from 'react';
import { Card } from '../ui';
import { SystemAdminDashboard } from './SystemAdminDashboard';
import { ClientManagement } from './ClientManagement';
import { GeographyManagement } from './GeographyManagement';

export function OUManagementConsolidated({ roleLabel, roleType, CompanyComponent }) {
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedGeo, setSelectedGeo] = useState(null);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{roleLabel}</h1>
            <p className="text-sm text-white/80">Manage all organizational data in one place</p>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <main className="flex-1 px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
        {/* COLUMN 1: Organizations */}
        <div className="flex flex-col space-y-3 w-full">
          {/* Header with Icon */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m5.581 0a2 2 0 100-4H9m0 4a2 2 0 100 4m11-4v-8" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-blue-400">Organizations</h2>
              <p className="text-xs text-slate-400">Companies & Departments</p>
            </div>
          </div>

          {/* Management List Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 w-full">
            <div className="p-4 w-full">
              <CompanyComponent hideDetails={true} onSelectionChange={setSelectedOrg} />
            </div>
          </Card>

          {/* Details Panel Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 w-full">
            <div className="p-4">
              <h4 className="font-semibold text-blue-400 mb-3 text-sm">Details</h4>
              {selectedOrg ? (
                <div>
                  <div className="space-y-2 text-sm mb-3 pb-3 border-b border-slate-700">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Name</p>
                      <p className="font-medium text-white">{selectedOrg.org_name || selectedOrg.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Type</p>
                      <p className="text-white">{selectedOrg.parent_org_id ? 'Department' : 'Company'}</p>
                    </div>
                    {selectedOrg.description && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Description</p>
                        <p className="text-white text-xs">{selectedOrg.description}</p>
                      </div>
                    )}
                    {selectedOrg.created_at && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Created</p>
                        <p className="text-white text-xs">{new Date(selectedOrg.created_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded border border-blue-500/30 transition-colors">
                      Edit
                    </button>
                    <button className="w-full px-3 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded border border-red-500/30 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4 text-xs">Select an organization to view details</p>
              )}
            </div>
          </Card>
        </div>

        {/* COLUMN 2: Clients */}
        <div className="flex flex-col space-y-3 w-full">
          {/* Header with Icon */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-green-400">Clients</h2>
              <p className="text-xs text-slate-400">Client Management</p>
            </div>
          </div>

          {/* Management List Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 w-full">
            <div className="p-4 w-full">
              <ClientManagement role={roleType} hideDetails={true} onSelectionChange={setSelectedClient} />
            </div>
          </Card>

          {/* Details Panel Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 w-full">
            <div className="p-4">
              <h4 className="font-semibold text-green-400 mb-3 text-sm">Details</h4>
              {selectedClient ? (
                <div>
                  <div className="space-y-2 text-sm mb-3 pb-3 border-b border-slate-700">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Name</p>
                      <p className="font-medium text-white">{selectedClient.client_name || selectedClient.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Code</p>
                      <p className="font-mono text-xs text-white">{selectedClient.client_code || selectedClient.code || 'N/A'}</p>
                    </div>
                    {selectedClient.description && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Description</p>
                        <p className="text-white text-xs">{selectedClient.description}</p>
                      </div>
                    )}
                    {selectedClient.status && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Status</p>
                        <p className="text-white text-xs">{selectedClient.status}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 text-xs bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded border border-green-500/30 transition-colors">
                      Edit
                    </button>
                    <button className="w-full px-3 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded border border-red-500/30 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4 text-xs">Select a client to view details</p>
              )}
            </div>
          </Card>
        </div>

        {/* COLUMN 3: Geography */}
        <div className="flex flex-col space-y-3 w-full">
          {/* Header with Icon */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.553-.894L9 7.882m0 0l6-3.5m-6 3.5v11.618l6 3.5m-6-11.118l6-3.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-purple-400">Geography</h2>
              <p className="text-xs text-slate-400">Regions & Locations</p>
            </div>
          </div>

          {/* Management List Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 w-full">
            <div className="p-4 w-full">
              <GeographyManagement hideDetails={true} onSelectionChange={setSelectedGeo} />
            </div>
          </Card>

          {/* Details Panel Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700 w-full">
            <div className="p-4">
              <h4 className="font-semibold text-purple-400 mb-3 text-sm">Details</h4>
              {selectedGeo ? (
                <div>
                  <div className="space-y-2 text-sm mb-3 pb-3 border-b border-slate-700">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Name</p>
                      <p className="font-medium text-white">{selectedGeo.geo_name || selectedGeo.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Code</p>
                      <p className="font-mono text-xs text-white">{selectedGeo.geo_code || selectedGeo.code || 'N/A'}</p>
                    </div>
                    {selectedGeo.description && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Description</p>
                        <p className="text-white text-xs">{selectedGeo.description}</p>
                      </div>
                    )}
                    {selectedGeo.status && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Status</p>
                        <p className="text-white text-xs">{selectedGeo.status}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded border border-purple-500/30 transition-colors">
                      Edit
                    </button>
                    <button className="w-full px-3 py-2 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded border border-red-500/30 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4 text-xs">Select a geography to view details</p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
