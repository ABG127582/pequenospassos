
import { storageService } from './storage';
import { showToast } from './utils';

const STORAGE_KEY_GAMIFICATION = 'user_gamification_data';

interface GamificationState {
    level: number;
    currentXP: number;
    xpToNextLevel: number;
}

const INITIAL_STATE: GamificationState = {
    level: 1,
    currentXP: 0,
    xpToNextLevel: 200
};

class GamificationService {
    private state: GamificationState;
    private profileLevelEl: HTMLElement | null = null;
    private xpFillEl: HTMLElement | null = null;
    private xpTextEl: HTMLElement | null = null;

    constructor() {
        this.state = storageService.get<GamificationState>(STORAGE_KEY_GAMIFICATION) || { ...INITIAL_STATE };
    }

    init() {
        this.profileLevelEl = document.querySelector('.profile-level');
        this.xpFillEl = document.querySelector('.xp-fill');
        this.xpTextEl = document.querySelector('.xp-text');
        this.render();
    }

    /**
     * Adiciona XP ao usuário.
     * @param amount Quantidade de XP a adicionar.
     */
    addXP(amount: number) {
        this.state.currentXP += amount;
        
        let leveledUp = false;
        // Check for level up
        while (this.state.currentXP >= this.state.xpToNextLevel) {
            this.state.currentXP -= this.state.xpToNextLevel;
            this.state.level++;
            this.state.xpToNextLevel = Math.floor(this.state.xpToNextLevel * 1.5); // Increase difficulty
            leveledUp = true;
        }

        this.save();
        this.render();

        if (leveledUp) {
            showToast(`🎉 Parabéns! Você alcançou o Nível ${this.state.level}!`, 'success');
            // Aqui poderia disparar confetes ou um som de vitória
        }
    }

    private save() {
        storageService.set(STORAGE_KEY_GAMIFICATION, this.state);
    }

    private render() {
        if (this.profileLevelEl) {
            this.profileLevelEl.textContent = `Nível ${this.state.level}`;
        }

        if (this.xpFillEl && this.xpTextEl) {
            const percentage = Math.min(100, (this.state.currentXP / this.state.xpToNextLevel) * 100);
            this.xpFillEl.style.width = `${percentage}%`;
            this.xpTextEl.textContent = `${Math.floor(this.state.currentXP)} / ${this.state.xpToNextLevel} PS`;
        }
    }
}

export const gamification = new GamificationService();
