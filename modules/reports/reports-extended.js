// Extended methods for ReportsModule
window.ReportsModule.verify = async function(reportId) {
    try {
        const deviceFingerprint = await window.DeviceFingerprint.generate();
        
        await Api.put(`/reports/${reportId}/verify`, { deviceFingerprint });
        
        window.Toast.success('Verificación agregada exitosamente. Gracias por tu contribución.');
        setTimeout(() => {
            this.closeModal();
            window.location.reload();
        }, 1500);
    } catch (error) {
        let errorMsg = 'Error al verificar el reporte.';
        if (error.message.includes('verificado')) {
            errorMsg = 'Ya has verificado este reporte anteriormente.';
        } else if (error.message) {
            errorMsg = error.message;
        }
        window.Toast.error(errorMsg);
    }
};

window.ReportsModule.startDispute = function(reportId) {
    const modalBody = document.getElementById('modalBody');
    window.DisputesModule.renderForm(modalBody, reportId);
};
