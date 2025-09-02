// This is a temporary file to hold our changes while fixing BaseModal.tsx
// Enemy Players Search Component
const EnemyPlayersSearch = ({ selectedPlayers, onPlayersChange }) => {
  return (
    <PlayerSearchSelector 
      selectedPlayers={selectedPlayers}
      onPlayersChange={onPlayersChange}
      maxHeight="100%"
    />
  )
}

// Report ID generation
const generateReportId = () => {
  return `R${Math.random().toString(36).substr(2, 6).toUpperCase()}`
}

// Add to formData initialization:
// reportId: modalType === "report" ? generateReportId() : ""

// Add to report modal header:
// {modalType === 'report' && (
//   <div className="text-blue-400 font-bold text-sm">
//     ID: {formData.reportId}
//   </div>
// )}

// Notes textarea at end of report modal:
// <textarea 
//   value={formData.notes} 
//   onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
//   className="w-full h-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500"
//   placeholder="Notes..."
// />