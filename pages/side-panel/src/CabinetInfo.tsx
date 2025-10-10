const CabinetInfo = () => {
    const handleSaveCabinet = () => {
        console.log('Save Cabinet clicked');
        // Add your save cabinet logic here
    };

    return (
        <div className="p-4 border-b border-gray-300">
            <button
                onClick={handleSaveCabinet}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Save Cabinet
            </button>
        </div>
    );
};

export default CabinetInfo;