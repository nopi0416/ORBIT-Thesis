'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit3, Power, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

interface Geo {
  geo_id: string;
  geo_code: string;
  geo_name: string;
  created_at: string;
  status: 'active' | 'inactive';
  locations_count: number;
  locations?: Location[];
}

interface Location {
  location_id: string;
  location_code: string;
  location_name: string;
  geo_id: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface GeographyManagementProps {
  role: 'system' | 'company';
}

export function GeographyManagement({ role }: GeographyManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [geos, setGeos] = useState<Geo[]>([
    {
      geo_id: '1',
      geo_code: 'APAC',
      geo_name: 'Asia Pacific',
      created_at: '2024-01-15',
      status: 'active',
      locations_count: 3,
      locations: [
        { location_id: '1-1', location_code: 'SG', location_name: 'Singapore', geo_id: '1', status: 'active', created_at: '2024-01-15' },
        { location_id: '1-2', location_code: 'JP', location_name: 'Japan', geo_id: '1', status: 'active', created_at: '2024-01-15' },
        { location_id: '1-3', location_code: 'AU', location_name: 'Australia', geo_id: '1', status: 'active', created_at: '2024-01-15' },
      ],
    },
    {
      geo_id: '2',
      geo_code: 'EMEA',
      geo_name: 'Europe, Middle East, Africa',
      created_at: '2024-01-15',
      status: 'active',
      locations_count: 2,
      locations: [
        { location_id: '2-1', location_code: 'UK', location_name: 'United Kingdom', geo_id: '2', status: 'active', created_at: '2024-01-15' },
        { location_id: '2-2', location_code: 'UAE', location_name: 'United Arab Emirates', geo_id: '2', status: 'active', created_at: '2024-01-15' },
      ],
    },
    {
      geo_id: '3',
      geo_code: 'AMER',
      geo_name: 'Americas',
      created_at: '2024-01-15',
      status: 'inactive',
      locations_count: 2,
      locations: [
        { location_id: '3-1', location_code: 'US', location_name: 'United States', geo_id: '3', status: 'inactive', created_at: '2024-01-15' },
        { location_id: '3-2', location_code: 'CA', location_name: 'Canada', geo_id: '3', status: 'inactive', created_at: '2024-01-15' },
      ],
    },
  ]);

  const [selectedGeo, setSelectedGeo] = useState<Geo | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [expandedGeos, setExpandedGeos] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [showAddGeoDialog, setShowAddGeoDialog] = useState(false);
  const [showEditGeoDialog, setShowEditGeoDialog] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [newGeoCode, setNewGeoCode] = useState('');
  const [newGeoName, setNewGeoName] = useState('');
  const [newLocationCode, setNewLocationCode] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [editGeoCode, setEditGeoCode] = useState('');
  const [editGeoName, setEditGeoName] = useState('');

  const toggleGeoExpand = (geoId: string) => {
    const newExpanded = new Set(expandedGeos);
    if (newExpanded.has(geoId)) {
      newExpanded.delete(geoId);
    } else {
      newExpanded.add(geoId);
    }
    setExpandedGeos(newExpanded);
  };

  const filteredGeos = geos.filter((g) => g.geo_name.toLowerCase().includes(searchTerm.toLowerCase()) || g.geo_code.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddGeo = () => {
    if (newGeoCode.trim() && newGeoName.trim() && newLocationCode.trim() && newLocationName.trim()) {
      const geoId = `geo-${Date.now()}`;
      const locationId = `loc-${Date.now()}`;
      const newGeo: Geo = {
        geo_id: geoId,
        geo_code: newGeoCode,
        geo_name: newGeoName,
        created_at: new Date().toISOString().split('T')[0],
        status: 'active',
        locations_count: 1,
        locations: [
          {
            location_id: locationId,
            location_code: newLocationCode,
            location_name: newLocationName,
            geo_id: geoId,
            status: 'active',
            created_at: new Date().toISOString().split('T')[0],
          },
        ],
      };
      setGeos([...geos, newGeo]);
      setShowAddGeoDialog(false);
      setNewGeoCode('');
      setNewGeoName('');
      setNewLocationCode('');
      setNewLocationName('');
      setExpandedGeos(new Set([...expandedGeos, geoId]));
    }
  };

  const handleAddLocation = () => {
    if (!selectedGeo || !newLocationCode.trim() || !newLocationName.trim()) return;
    const locationId = `loc-${Date.now()}`;
    const updatedGeos = geos.map((g) => {
      if (g.geo_id === selectedGeo.geo_id) {
        const newLocation: Location = {
          location_id: locationId,
          location_code: newLocationCode,
          location_name: newLocationName,
          geo_id: g.geo_id,
          status: g.status === 'active' ? 'active' : 'inactive',
          created_at: new Date().toISOString().split('T')[0],
        };
        return {
          ...g,
          locations: [...(g.locations || []), newLocation],
          locations_count: (g.locations?.length || 0) + 1,
        };
      }
      return g;
    });
    setGeos(updatedGeos);
    const updatedGeo = updatedGeos.find((g) => g.geo_id === selectedGeo.geo_id);
    if (updatedGeo) {
      setSelectedGeo(updatedGeo);
    }
    setShowAddLocationDialog(false);
    setNewLocationCode('');
    setNewLocationName('');
  };

  const handleEditGeo = () => {
    if (!selectedGeo || !editGeoCode.trim() || !editGeoName.trim()) return;
    const updatedGeos = geos.map((g) =>
      g.geo_id === selectedGeo.geo_id ? { ...g, geo_code: editGeoCode, geo_name: editGeoName } : g
    );
    setGeos(updatedGeos);
    const updatedGeo = updatedGeos.find((g) => g.geo_id === selectedGeo.geo_id);
    if (updatedGeo) {
      setSelectedGeo(updatedGeo);
    }
    setShowEditGeoDialog(false);
  };

  const handleToggleGeoStatus = () => {
    if (!selectedGeo) return;
    const updatedGeos = geos.map((g) => {
      if (g.geo_id === selectedGeo.geo_id) {
        const newStatus = g.status === 'active' ? 'inactive' : 'active';
        return {
          ...g,
          status: newStatus,
          locations: g.locations?.map((loc) => ({ ...loc, status: newStatus })),
        };
      }
      return g;
    });
    setGeos(updatedGeos);
    const updatedGeo = updatedGeos.find((g) => g.geo_id === selectedGeo.geo_id);
    if (updatedGeo) {
      setSelectedGeo(updatedGeo);
    }
  };

  const handleToggleLocationStatus = (location: Location) => {
    if (!selectedGeo) return;
    const updatedGeos = geos.map((g) => {
      if (g.geo_id === selectedGeo.geo_id) {
        return {
          ...g,
          locations: g.locations?.map((loc) =>
            loc.location_id === location.location_id ? { ...loc, status: loc.status === 'active' ? 'inactive' : 'active' } : loc
          ),
        };
      }
      return g;
    });
    setGeos(updatedGeos);
    const updatedGeo = updatedGeos.find((g) => g.geo_id === selectedGeo.geo_id);
    if (updatedGeo) {
      setSelectedGeo(updatedGeo);
    }
  };

  const openEditGeoDialog = () => {
    if (selectedGeo) {
      setEditGeoCode(selectedGeo.geo_code);
      setEditGeoName(selectedGeo.geo_name);
      setShowEditGeoDialog(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Geos List */}
      <div className="lg:col-span-2">
        <Card className="p-3 flex flex-col" style={{ height: filteredGeos.length > 7 ? Math.min(filteredGeos.length, 7) * 64 + 115 : 'fit-content' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">Geography</h3>
              <p className="text-xs text-muted-foreground">Regions & Locations</p>
            </div>
            <Dialog open={showAddGeoDialog} onOpenChange={setShowAddGeoDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Geo</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">Add location when creating</p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="geoCode">Code</Label>
                    <Input id="geoCode" placeholder="e.g., APAC" value={newGeoCode} onChange={(e) => setNewGeoCode(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="geoName">Name</Label>
                    <Input id="geoName" placeholder="e.g., Asia Pacific" value={newGeoName} onChange={(e) => setNewGeoName(e.target.value)} />
                  </div>
                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-xs mb-2">Location</h4>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="locCode" className="text-xs">Code</Label>
                        <Input id="locCode" placeholder="e.g., SG" value={newLocationCode} onChange={(e) => setNewLocationCode(e.target.value)} size={6 as any} />
                      </div>
                      <div>
                        <Label htmlFor="locName" className="text-xs">Name</Label>
                        <Input id="locName" placeholder="e.g., Singapore" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowAddGeoDialog(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddGeo}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 mb-2 text-sm" />

          <div className={`space-y-1 ${filteredGeos.length > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`} style={{ height: filteredGeos.length > 7 ? Math.min(filteredGeos.length, 7) * 64 : 'auto', maxHeight: Math.min(filteredGeos.length, 7) * 64 }}>
            {filteredGeos.map((geo) => (
              <Card
                key={geo.geo_id}
                className={`p-2 cursor-pointer transition-colors ${
                  selectedGeo?.geo_id === geo.geo_id ? 'bg-accent border-primary' : 'hover:bg-accent'
                }`}
                onClick={() => setSelectedGeo(geo)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{geo.geo_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{geo.geo_code}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{geo.locations_count}</Badge>
                    <Badge variant={geo.status === 'active' ? 'default' : 'destructive'} className="text-xs">{geo.status}</Badge>
                  </div>
                </div>
              </Card>
            ))}

            {filteredGeos.length === 0 && <p className="text-center text-muted-foreground text-xs py-4">No geos</p>}
          </div>
        </Card>
      </div>

      {/* Details Panel */}
      <div>
        <Card className="p-3" style={{ height: 'fit-content' }}>
          {selectedGeo ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{selectedGeo.geo_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{selectedGeo.geo_code}</p>
                </div>
                <Badge variant={selectedGeo.status === 'active' ? 'default' : 'destructive'} className="text-xs">{selectedGeo.status}</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm">{selectedGeo.created_at}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Locations ({selectedGeo.locations_count})</Label>
                </div>
              </div>

              <div className={`border-t pt-2 space-y-1 ${selectedGeo.locations && selectedGeo.locations.length > 3 ? 'overflow-y-auto max-h-52' : 'overflow-hidden'}`}>
                {selectedGeo.locations && selectedGeo.locations.length > 0 ? (
                  selectedGeo.locations.map((location) => (
                    <div key={location.location_id} className="p-2 bg-muted rounded border border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{location.location_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{location.location_code}</p>
                        </div>
                        <Badge variant={location.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                          {location.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No locations</p>
                )}
              </div>

              <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 w-full text-xs bg-transparent">
                    <Plus className="h-3 w-3" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add to {selectedGeo.geo_name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="newLocCode">Code</Label>
                      <Input id="newLocCode" placeholder="e.g., JP" value={newLocationCode} onChange={(e) => setNewLocationCode(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="newLocName">Name</Label>
                      <Input id="newLocName" placeholder="e.g., Japan" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setShowAddLocationDialog(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddLocation}>Add</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="border-t pt-2 space-y-1">
                <Button size="sm" variant="outline" onClick={openEditGeoDialog} className="gap-1 w-full text-xs bg-transparent">
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={handleToggleGeoStatus}
                  variant={selectedGeo.status === 'active' ? 'destructive' : 'outline'}
                  className="gap-1 w-full text-xs"
                >
                  <Power className="h-3 w-3" />
                  {selectedGeo.status === 'active' ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-muted-foreground text-xs">Select a geo</p>
            </div>
          )}
        </Card>
      </div>

      {showEditGeoDialog && selectedGeo && (
        <Dialog open={showEditGeoDialog} onOpenChange={setShowEditGeoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Geo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="editGeoCode">Code</Label>
                <Input id="editGeoCode" value={editGeoCode} onChange={(e) => setEditGeoCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="editGeoName">Name</Label>
                <Input id="editGeoName" value={editGeoName} onChange={(e) => setEditGeoName(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowEditGeoDialog(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleEditGeo}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
