import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '../ui';
import { Plus, Edit3, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createGeo,
  createLocation,
  getGeoList,
  getLocations,
  updateGeo,
} from '../../services/budgetConfigService';

const buildGeoTree = (geoRows = [], locationRows = []) => {
  const geoMap = {};
  geoRows.forEach((geo) => {
    geoMap[geo.geo_id] = {
      ...geo,
      status: 'active',
      locations: [],
      locations_count: 0,
    };
  });

  locationRows.forEach((location) => {
    const geo = geoMap[location.geo_id];
    if (geo) {
      geo.locations.push({
        ...location,
        status: 'active',
      });
    }
  });

  return Object.values(geoMap).map((geo) => ({
    ...geo,
    locations_count: geo.locations.length,
  }));
};

export function GeographyManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [geos, setGeos] = useState([]);

  const [selectedGeo, setSelectedGeo] = useState(null);
  const [showAddGeoDialog, setShowAddGeoDialog] = useState(false);
  const [showEditGeoDialog, setShowEditGeoDialog] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [newGeoCode, setNewGeoCode] = useState('');
  const [newGeoName, setNewGeoName] = useState('');
  const [newLocationCode, setNewLocationCode] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [editGeoCode, setEditGeoCode] = useState('');
  const [editGeoName, setEditGeoName] = useState('');

  const token = localStorage.getItem('authToken');
  const updatedBy = user?.id || user?.email || user?.name || 'system';

  const fetchGeography = async () => {
    try {
      const [geoRows, locationRows] = await Promise.all([
        getGeoList(token),
        getLocations(null, token),
      ]);
      const mapped = buildGeoTree(geoRows, locationRows);
      setGeos(mapped);
    } catch (error) {
      console.error('Failed to load geography:', error);
      setGeos([]);
    }
  };

  useEffect(() => {
    fetchGeography();
  }, []);

  useEffect(() => {
    if (selectedGeo) {
      const match = geos.find((geo) => geo.geo_id === selectedGeo.geo_id);
      if (!match) {
        setSelectedGeo(null);
      } else if (match !== selectedGeo) {
        setSelectedGeo(match);
      }
    }
  }, [geos, selectedGeo]);

  const filteredGeos = geos.filter((geo) =>
    geo.geo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    geo.geo_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddGeo = async () => {
    if (!newGeoCode.trim() || !newGeoName.trim() || !newLocationCode.trim() || !newLocationName.trim()) {
      return;
    }

    try {
      const geo = await createGeo(
        {
          geo_code: newGeoCode.trim(),
          geo_name: newGeoName.trim(),
          created_by: updatedBy,
        },
        token
      );

      if (geo?.geo_id) {
        await createLocation(
          {
            geo_id: geo.geo_id,
            location_code: newLocationCode.trim(),
            location_name: newLocationName.trim(),
            created_by: updatedBy,
          },
          token
        );
      }

      setShowAddGeoDialog(false);
      setNewGeoCode('');
      setNewGeoName('');
      setNewLocationCode('');
      setNewLocationName('');
      await fetchGeography();
    } catch (error) {
      console.error('Failed to create geo:', error);
    }
  };

  const handleAddLocation = async () => {
    if (!selectedGeo || !newLocationCode.trim() || !newLocationName.trim()) return;

    try {
      await createLocation(
        {
          geo_id: selectedGeo.geo_id,
          location_code: newLocationCode.trim(),
          location_name: newLocationName.trim(),
          created_by: updatedBy,
        },
        token
      );
      setShowAddLocationDialog(false);
      setNewLocationCode('');
      setNewLocationName('');
      await fetchGeography();
    } catch (error) {
      console.error('Failed to create location:', error);
    }
  };

  const handleEditGeo = async () => {
    if (!selectedGeo || !editGeoCode.trim() || !editGeoName.trim()) return;

    try {
      await updateGeo(
        selectedGeo.geo_id,
        { geo_code: editGeoCode.trim(), geo_name: editGeoName.trim(), updated_by: updatedBy },
        token
      );
      setShowEditGeoDialog(false);
      await fetchGeography();
    } catch (error) {
      console.error('Failed to update geo:', error);
    }
  };

  const handleToggleGeoStatus = () => {};

  const openEditGeoDialog = () => {
    if (selectedGeo) {
      setEditGeoCode(selectedGeo.geo_code);
      setEditGeoName(selectedGeo.geo_name);
      setShowEditGeoDialog(true);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="lg:col-span-2">
        <Card
          className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white"
          style={{ height: filteredGeos.length > 7 ? Math.min(filteredGeos.length, 7) * 64 + 115 : 'fit-content' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base">Geography</h3>
              <p className="text-xs text-muted-foreground">Regions and Locations</p>
            </div>
            <Dialog open={showAddGeoDialog} onOpenChange={setShowAddGeoDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                  <Plus className="h-3 w-3" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Geo</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-400">Add location when creating</p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="geoCode">Code</Label>
                    <Input
                      id="geoCode"
                      placeholder="e.g., APAC"
                      value={newGeoCode}
                      onChange={(event) => setNewGeoCode(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="geoName">Name</Label>
                    <Input
                      id="geoName"
                      placeholder="e.g., Asia Pacific"
                      value={newGeoName}
                      onChange={(event) => setNewGeoName(event.target.value)}
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <h4 className="font-semibold text-xs mb-2">Location</h4>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="locCode" className="text-xs">Code</Label>
                        <Input
                          id="locCode"
                          placeholder="e.g., SG"
                          value={newLocationCode}
                          onChange={(event) => setNewLocationCode(event.target.value)}
                          size={6}
                        />
                      </div>
                      <div>
                        <Label htmlFor="locName" className="text-xs">Name</Label>
                        <Input
                          id="locName"
                          placeholder="e.g., Singapore"
                          value={newLocationName}
                          onChange={(event) => setNewLocationName(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowAddGeoDialog(false)} className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleAddGeo}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-8 mb-2 text-sm"
          />

          <div
            className={`space-y-1 ${filteredGeos.length > 7 ? 'overflow-y-auto pr-2' : 'overflow-hidden'}`}
            style={{
              height: filteredGeos.length > 7 ? Math.min(filteredGeos.length, 7) * 64 : 'auto',
              maxHeight: Math.min(filteredGeos.length, 7) * 64,
            }}
          >
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
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        geo.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {geo.status}
                    </span>
                  </div>
                </div>
              </Card>
            ))}

            {filteredGeos.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-4">No geos</p>
            )}
          </div>
        </Card>
      </div>

      <div>
        <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ height: 'fit-content' }}>
          {selectedGeo ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{selectedGeo.geo_name}</h3>
                  <p className="text-xs text-slate-400 truncate">{selectedGeo.geo_code}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    selectedGeo.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {selectedGeo.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-xs text-slate-400">Created</Label>
                  <p className="text-sm">{selectedGeo.created_at}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Locations ({selectedGeo.locations_count})</Label>
                </div>
              </div>

              <div
                className={`border-t pt-2 space-y-1 ${
                  selectedGeo.locations && selectedGeo.locations.length > 3 ? 'overflow-y-auto max-h-52' : 'overflow-hidden'
                }`}
              >
                {selectedGeo.locations && selectedGeo.locations.length > 0 ? (
                  selectedGeo.locations.map((location) => (
                    <div key={location.location_id} className="p-2 bg-muted rounded border border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{location.location_name}</p>
                          <p className="text-xs text-slate-400 truncate">{location.location_code}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            location.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {location.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No locations</p>
                )}
              </div>

              <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 w-full text-xs !bg-violet-500/80 hover:!bg-violet-500 !text-white">
                    <Plus className="h-3 w-3" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle>Add to {selectedGeo.geo_name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="newLocCode">Code</Label>
                      <Input
                        id="newLocCode"
                        placeholder="e.g., JP"
                        value={newLocationCode}
                        onChange={(event) => setNewLocationCode(event.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newLocName">Name</Label>
                      <Input
                        id="newLocName"
                        placeholder="e.g., Japan"
                        value={newLocationName}
                        onChange={(event) => setNewLocationName(event.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setShowAddLocationDialog(false)} className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                        Cancel
                      </Button>
                      <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleAddLocation}>
                        Add
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="border-t pt-2 space-y-1">
                <Button size="sm" className="gap-1 w-full text-xs bg-blue-500/80 hover:bg-blue-500 text-white" onClick={openEditGeoDialog}>
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={handleToggleGeoStatus}
                  variant={selectedGeo.status === 'active' ? 'destructive' : 'outline'}
                  disabled
                  className={`gap-1 w-full text-xs ${
                    selectedGeo.status === 'active'
                      ? 'bg-red-500/80 hover:bg-red-500 text-white'
                      : 'bg-emerald-500/80 hover:bg-emerald-500 text-white'
                  } opacity-60 cursor-not-allowed`}
                >
                  <Power className="h-3 w-3" />
                  {selectedGeo.status === 'active' ? 'Deactivate' : 'Reactivate'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-center text-slate-400 text-xs">Select a geo</p>
            </div>
          )}
        </Card>
      </div>

      {showEditGeoDialog && selectedGeo && (
        <Dialog open={showEditGeoDialog} onOpenChange={setShowEditGeoDialog}>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Geo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="editGeoCode">Code</Label>
                <Input id="editGeoCode" value={editGeoCode} onChange={(event) => setEditGeoCode(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="editGeoName">Name</Label>
                <Input id="editGeoName" value={editGeoName} onChange={(event) => setEditGeoName(event.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowEditGeoDialog(false)} className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600">
                  Cancel
                </Button>
                <Button size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white" onClick={handleEditGeo}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
