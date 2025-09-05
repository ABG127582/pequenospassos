import { showToast } from './ui';

let rainAudio: HTMLAudioElement | null = null;

export function toggleRainSound() {
    const button = document.getElementById('rain-sound-toggle');
    if (!button) return;

    if (!rainAudio) {
        rainAudio = document.getElementById('rain-sound') as HTMLAudioElement;
        if (!rainAudio) {
            console.error("Rain sound audio element not found.");
            showToast("Elemento de áudio não encontrado.", "error");
            return;
        }
        rainAudio.loop = true;
        rainAudio.volume = 0.3;
    }

    if (rainAudio.paused) {
        const playPromise = rainAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(_ => {
                // Playback started successfully.
                button.innerHTML = '<i class="fas fa-stop-circle"></i>';
                button.setAttribute('aria-label', 'Desativar som de chuva');
                localStorage.setItem('rainSoundPlaying', 'true');
            }).catch(error => {
                // Autoplay was prevented by browser policy.
                console.log("Audio autoplay was prevented by the browser.");
                button.innerHTML = '<i class="fas fa-cloud-rain"></i>';
                button.setAttribute('aria-label', 'Ativar som de chuva');
                localStorage.setItem('rainSoundPlaying', 'false');
            });
        }
    } else {
        rainAudio.pause();
        button.innerHTML = '<i class="fas fa-cloud-rain"></i>';
        button.setAttribute('aria-label', 'Ativar som de chuva');
        localStorage.setItem('rainSoundPlaying', 'false');
    }
}
