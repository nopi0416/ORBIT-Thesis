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
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { handlePaste, handleRestrictedKeyDown, sanitizeOuText } from '../../utils/inputSanitizer';
import {
  createGeo,
  createLocation,
  deleteLocation,
  getGeoList,
  getLocations,
  updateGeo,
} from '../../services/budgetConfigService';

const buildGeoTree = (geoRows = [], locationRows = []) => {
  const geoMap = {};
  geoRows.forEach((geo) => {
    geoMap[geo.geo_id] = {
      ...geo,
      locations: [],
      locations_count: 0,
    };
  });

  locationRows.forEach((location) => {
    const geo = geoMap[location.geo_id];
    if (geo) {
      geo.locations.push({
        ...location,
      });
    }
  });

  return Object.values(geoMap).map((geo) => ({
    ...geo,
    locations_count: geo.locations.length,
  }));
};

export function GeographyManagement({ hideDetails = false, onSelectionChange } = {}) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [geos, setGeos] = useState([]);

  const [selectedGeo, setSelectedGeo] = useState(null);
  const [showAddGeoDialog, setShowAddGeoDialog] = useState(false);
  const [showEditGeoDialog, setShowEditGeoDialog] = useState(false);
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [showDeleteLocationDialog, setShowDeleteLocationDialog] = useState(false);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);
  const [isCreatingGeo, setIsCreatingGeo] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isUpdatingGeo, setIsUpdatingGeo] = useState(false);
  const [newGeoCode, setNewGeoCode] = useState('');
  const [newGeoName, setNewGeoName] = useState('');
  const [newLocationCode, setNewLocationCode] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [editGeoCode, setEditGeoCode] = useState('');
  const [editGeoName, setEditGeoName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [deleteLocationConfirmText, setDeleteLocationConfirmText] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationVariant, setNotificationVariant] = useState('success');

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
    if (!selectedGeo) return;

    const match = geos.find((geo) => geo.geo_id === selectedGeo.geo_id);
    if (!match) {
      setSelectedGeo(null);
      return;
    }

    const shouldUpdate =
      match.geo_name !== selectedGeo.geo_name ||
      match.geo_code !== selectedGeo.geo_code ||
      match.created_at !== selectedGeo.created_at ||
      match.locations_count !== selectedGeo.locations_count;

    if (shouldUpdate) {
      setSelectedGeo(match);
    }
  }, [geos, selectedGeo]);

  useEffect(() => {
    if (!selectedGeo) {
      setSelectedLocation(null);
      return;
    }

    if (!selectedLocation) return;

    const match = selectedGeo.locations?.find(
      (location) => location.location_id === selectedLocation.location_id
    );

    if (!match) {
      setSelectedLocation(null);
      return;
    }

    const shouldUpdate =
      match.location_name !== selectedLocation.location_name ||
      match.location_code !== selectedLocation.location_code ||
      match.created_at !== selectedLocation.created_at;

    if (shouldUpdate) {
      setSelectedLocation(match);
    }
  }, [selectedGeo, selectedLocation]);

  // Notify parent when geography selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedGeo);
    }
  }, [selectedGeo, onSelectionChange]);

  const filteredGeos = geos.filter((geo) =>
    geo.geo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    geo.geo_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notify = (message, variant = 'success') => {
    setNotificationMessage(message);
    setNotificationVariant(variant);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const handleOuInputChange = (setter, allowNewlines = false, transform = null) => (event) => {
    const sanitized = sanitizeOuText(event.target.value, allowNewlines);
    setter(transform ? transform(sanitized) : sanitized);
  };

  const handleOuPaste = (allowNewlines = false, transform = null) => (event) => {
    handlePaste(event, (value) => {
      const sanitized = sanitizeOuText(value, allowNewlines);
      return transform ? transform(sanitized) : sanitized;
    });
  };

  const handleOuKeyDown = (allowEnter = false) => (event) => {
    handleRestrictedKeyDown(event, { allowEnter });
  };

  const handleAddGeo = async () => {
    if (!newGeoCode.trim() || !newGeoName.trim() || !newLocationCode.trim() || !newLocationName.trim()) {
      return;
    }

    if (isCreatingGeo) return;
    setIsCreatingGeo(true);

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
      notify('Geo created successfully.');
    } catch (error) {
      console.error('Failed to create geo:', error);
      notify('Failed to create geo.', 'error');
    } finally {
      setIsCreatingGeo(false);
    }
  };

  const handleAddLocation = async () => {
    if (!selectedGeo || !newLocationCode.trim() || !newLocationName.trim()) return;

    if (isCreatingLocation) return;
    setIsCreatingLocation(true);

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
      notify('Location added successfully.');
    } catch (error) {
      console.error('Failed to create location:', error);
      notify('Failed to create location.', 'error');
    } finally {
      setIsCreatingLocation(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;

    if (isDeletingLocation) return;
    setIsDeletingLocation(true);

    try {
      await deleteLocation(selectedLocation.location_id, token);
      setShowDeleteLocationDialog(false);
      setDeleteLocationConfirmText('');
      setSelectedLocation(null);
      await fetchGeography();
      notify('Location deleted successfully.');
    } catch (error) {
      console.error('Failed to delete location:', error);
      notify('Failed to delete location.', 'error');
    } finally {
      setIsDeletingLocation(false);
    }
  };

  const handleEditGeo = async () => {
    if (!selectedGeo || !editGeoCode.trim() || !editGeoName.trim()) return;

    if (isUpdatingGeo) return;
    setIsUpdatingGeo(true);

    try {
      await updateGeo(
        selectedGeo.geo_id,
        { geo_code: editGeoCode.trim(), geo_name: editGeoName.trim(), updated_by: updatedBy },
        token
      );
      setShowEditGeoDialog(false);
      await fetchGeography();
      notify('Geo updated successfully.');
    } catch (error) {
      console.error('Failed to update geo:', error);
      notify('Failed to update geo.', 'error');
    } finally {
      setIsUpdatingGeo(false);
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
    <div className="flex flex-col h-full gap-3 min-h-0 w-full">
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 w-full max-w-md">
          {notificationVariant === 'error' ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-400 flex-1">{notificationMessage}</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/45 border border-emerald-400/80 rounded-lg p-4 backdrop-blur-sm shadow-2xl ring-1 ring-emerald-300/60">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-emerald-400 flex-1">{notificationMessage}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <Card
        className="p-3 flex flex-col bg-slate-800/80 border-slate-700 text-white flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base">Geography</h3>
          </div>
          <Dialog
            open={showAddGeoDialog}
            onOpenChange={(open) => {
              if (isCreatingGeo) return;
              setShowAddGeoDialog(open);
            }}
          >
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
                    onChange={handleOuInputChange(setNewGeoCode)}
                    onPaste={handleOuPaste()}
                    onKeyDown={handleOuKeyDown()}
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="geoName">Name</Label>
                  <Input
                    id="geoName"
                    placeholder="e.g., Asia Pacific"
                    value={newGeoName}
                    onChange={handleOuInputChange(setNewGeoName)}
                    onPaste={handleOuPaste()}
                    onKeyDown={handleOuKeyDown()}
                    maxLength={50}
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
                        onChange={handleOuInputChange(setNewLocationCode)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={10}
                        size={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="locName" className="text-xs">Name</Label>
                      <Input
                        id="locName"
                        placeholder="e.g., Singapore"
                        value={newLocationName}
                        onChange={handleOuInputChange(setNewLocationName)}
                        onPaste={handleOuPaste()}
                        onKeyDown={handleOuKeyDown()}
                        maxLength={50}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddGeoDialog(false)}
                    className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                    disabled={isCreatingGeo}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                    onClick={handleAddGeo}
                    disabled={isCreatingGeo}
                  >
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
          onChange={handleOuInputChange(setSearchTerm)}
          onPaste={handleOuPaste()}
          onKeyDown={handleOuKeyDown()}
          maxLength={50}
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
              onClick={() => {
                setSelectedGeo((prev) =>
                  prev?.geo_id === geo.geo_id ? null : geo
                );
                setSelectedLocation(null);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{geo.geo_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{geo.geo_code}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">{geo.locations_count}</Badge>
                </div>
              </div>
            </Card>
          ))}

          {filteredGeos.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-4">No geos</p>
          )}
        </div>
      </Card>

      {selectedGeo ? (
        <Card className="p-0 bg-slate-800/80 border-slate-700 text-white" style={{ maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
          <div className="p-3 flex-1 overflow-y-auto space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate">{selectedGeo.geo_name}</h3>
                <p className="text-xs text-slate-400 truncate">{selectedGeo.geo_code}</p>
              </div>
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
                  <div
                    key={location.location_id}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      selectedLocation?.location_id === location.location_id
                        ? 'bg-slate-700/60 border-fuchsia-500/60'
                        : 'bg-muted border-border/50 hover:bg-slate-700/40'
                    }`}
                    onClick={() => {
                      setSelectedLocation((prev) =>
                        prev?.location_id === location.location_id ? null : location
                      );
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs truncate">{location.location_name}</p>
                        <p className="text-xs text-slate-400 truncate">{location.location_code}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No locations</p>
              )}
            </div>

            {selectedLocation && (
              <div className="border-t pt-3 space-y-2">
                <div>
                  <Label className="text-xs text-slate-400">Location Name</Label>
                  <p className="text-sm text-white">{selectedLocation.location_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Location Code</Label>
                  <p className="text-sm text-white">{selectedLocation.location_code}</p>
                </div>
                {selectedLocation.created_at && (
                  <div>
                    <Label className="text-xs text-slate-400">Created</Label>
                    <p className="text-sm text-white">{selectedLocation.created_at}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 flex items-center justify-end gap-2 bg-slate-800/80 border-t border-slate-700/50">
            {selectedLocation && (
              <Dialog
                open={showDeleteLocationDialog}
                onOpenChange={(open) => {
                  if (isDeletingLocation) return;
                  setShowDeleteLocationDialog(open);
                  if (!open) {
                    setDeleteLocationConfirmText('');
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 !bg-red-500/80 hover:!bg-red-500 !text-white">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Location</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-white">
                      Delete <span className="font-semibold">{selectedLocation.location_name}</span>? This action cannot be undone.
                    </p>
                    <div>
                      <Label className="text-xs text-slate-400">Type CONFIRM to continue</Label>
                      <Input
                        value={deleteLocationConfirmText}
                        onChange={handleOuInputChange(setDeleteLocationConfirmText, false, (value) => value.toUpperCase())}
                        onPaste={handleOuPaste(false, (value) => value.toUpperCase())}
                        onKeyDown={(event) => {
                          handleRestrictedKeyDown(event);
                          if (event.key === 'Enter' && deleteLocationConfirmText === 'CONFIRM' && !isDeletingLocation) {
                            event.preventDefault();
                            handleDeleteLocation();
                          }
                        }}
                        maxLength={7}
                        placeholder="CONFIRM"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeleteLocationDialog(false)}
                        className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                        disabled={isDeletingLocation}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="!bg-red-500/80 hover:!bg-red-500 !text-white"
                        onClick={handleDeleteLocation}
                        disabled={deleteLocationConfirmText !== 'CONFIRM' || isDeletingLocation}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Dialog
              open={showAddLocationDialog}
              onOpenChange={(open) => {
                if (isCreatingLocation) return;
                setShowAddLocationDialog(open);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 !bg-violet-500/80 hover:!bg-violet-500 !text-white">
                  <Plus className="h-3 w-3" />
                  Add
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
                      onChange={handleOuInputChange(setNewLocationCode)}
                      onPaste={handleOuPaste()}
                      onKeyDown={handleOuKeyDown()}
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newLocName">Name</Label>
                    <Input
                      id="newLocName"
                      placeholder="e.g., Japan"
                      value={newLocationName}
                      onChange={handleOuInputChange(setNewLocationName)}
                      onPaste={handleOuPaste()}
                      onKeyDown={handleOuKeyDown()}
                      maxLength={50}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddLocationDialog(false)}
                      className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                      disabled={isCreatingLocation}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                      onClick={handleAddLocation}
                      disabled={isCreatingLocation}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showEditGeoDialog}
              onOpenChange={(open) => {
                if (isUpdatingGeo) return;
                setShowEditGeoDialog(open);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-blue-500/80 hover:bg-blue-500 text-white" onClick={openEditGeoDialog}>
                  <Edit3 className="h-3 w-3" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Edit Geo</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="editGeoCode">Code</Label>
                    <Input
                      id="editGeoCode"
                      value={editGeoCode}
                      onChange={handleOuInputChange(setEditGeoCode)}
                      onPaste={handleOuPaste()}
                      onKeyDown={handleOuKeyDown()}
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editGeoName">Name</Label>
                    <Input
                      id="editGeoName"
                      value={editGeoName}
                      onChange={handleOuInputChange(setEditGeoName)}
                      onPaste={handleOuPaste()}
                      onKeyDown={handleOuKeyDown()}
                      maxLength={50}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowEditGeoDialog(false)}
                      className="border-slate-600 text-white bg-slate-700/60 hover:bg-slate-600"
                      disabled={isUpdatingGeo}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                      onClick={handleEditGeo}
                      disabled={isUpdatingGeo}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>
      ) : (
        <Card className="p-3 bg-slate-800/80 border-slate-700 text-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-slate-400 text-xs">Select a geography to view details</p>
        </Card>
      )}
    </div>
  );
}

