import { Component, signal, computed, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

interface Spell {
  name: string;
  level: number;
  isCantrip: boolean;
  prepared: boolean;
  range: string;
  castingTime: string;
  description: string;
}

interface Weapon {
  name: string;
  ability: 'str' | 'dex' | 'wis'; // wis for Shillelagh or Spells!
  damageDie: string;
  proficient: boolean;
  type: string;
}

type SlotTracker = {
  max: WritableSignal<number>;
  used: WritableSignal<number>;
};

type StatKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
type ModKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,
    MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatGridListModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Character Info
  name = signal('Zorya Yaroslava');
  class = signal('Druid');
  level = signal(3);

  // Proficiency bonus scales with level: floor((level - 1) / 4) + 2
  proficiencyBonus = computed(() => Math.floor((this.level() - 1) / 4) + 2);

  // Ability Scores
  stats = {
    strength: signal(10),
    dexterity: signal(14),
    constitution: signal(12),
    intelligence: signal(10),
    wisdom: signal(16),
    charisma: signal(8),
  };

  // Modifiers (Calculated automatically)
  modifiers = {
    str: computed(() => Math.floor((this.stats.strength() - 10) / 2)),
    dex: computed(() => Math.floor((this.stats.dexterity() - 10) / 2)),
    con: computed(() => Math.floor((this.stats.constitution() - 10) / 2)),
    int: computed(() => Math.floor((this.stats.intelligence() - 10) / 2)),
    wis: computed(() => Math.floor((this.stats.wisdom() - 10) / 2)),
    cha: computed(() => Math.floor((this.stats.charisma() - 10) / 2)),
  };

  abilityConfigs: { label: string; stat: StatKey; mod: ModKey }[] = [
    { label: 'Strength', stat: 'strength', mod: 'str' },
    { label: 'Dexterity', stat: 'dexterity', mod: 'dex' },
    { label: 'Constitution', stat: 'constitution', mod: 'con' },
    { label: 'Intelligence', stat: 'intelligence', mod: 'int' },
    { label: 'Wisdom', stat: 'wisdom', mod: 'wis' },
    { label: 'Charisma', stat: 'charisma', mod: 'cha' },
  ];

  // Example Skill: Perception (Wisdom-based)
  isPerceptionProficient = signal(true);
  perception = computed(() => {
    const base = this.modifiers.wis();
    const bonus = this.isPerceptionProficient() ? this.proficiencyBonus() : 0;
    return base + bonus;
  });

  // Passive Perception: 10 + Perception Bonus
  passivePerception = computed(() => 10 + this.perception());

  combat = {
    hp: {
      current: signal(24),
      max: signal(24),
      temp: signal(0),
    },
    ac: signal(16),
    initiative: computed(() => this.modifiers.dex()), // Usually just your DEX mod
    speed: signal(30), // standard is 30ft
    hitDice: {
      total: signal(3), // equal to your level
      type: 'd8', // Druid's hit die
      remaining: signal(3),
    },
    deathSaves: {
      successes: signal(0), // 0 to 3
      failures: signal(0), // 0 to 3
    },
  };

  spellcasting = {
    ability: 'Wisdom',

    // Spell Save DC: 8 + Proficiency + Wisdom Mod
    saveDC: computed(() => 8 + this.proficiencyBonus() + this.modifiers.wis()),

    // Spell Attack Bonus: Proficiency + Wisdom Mod
    spellAttackBonus: computed(() => this.proficiencyBonus() + this.modifiers.wis()),
  };

  inventory = signal([
    { name: 'Leather Armor', weight: 10 },
    { name: 'Wooden Shield', weight: 6 },
    { name: 'Druidic Focus', weight: 1 },
  ]);

  currency = {
    gp: signal(15),
    sp: signal(10),
    cp: signal(0),
  };

  proficiencies = {
    languages: signal(['Common', 'Druidic', 'Sylvan']),
    tools: signal(['Herbalism Kit']),
    armor: signal(['Light', 'Medium', 'Shields']),
  };

  features = signal([
    { title: 'Wild Shape', description: 'Transform into a beast you have seen before.' },
    { title: 'Natural Recovery', description: 'Regain some spell slots on a short rest.' },
  ]);

  // Track slots for each level
  spellSlots: SlotTracker[] = [
    { max: signal(0), used: signal(0) }, // Level 0 (Cantrips)
    { max: signal(4), used: signal(0) }, // Level 1
    { max: signal(2), used: signal(0) }, // Level 2
    { max: signal(0), used: signal(0) }, // Level 3
  ];

  spells = signal<Spell[]>([
    {
      name: 'Guidance',
      level: 0,
      isCantrip: true,
      prepared: true,
      range: 'Touch',
      castingTime: '1 Action',
      description: 'Grant 1d4 to an ability check.',
    },
    {
      name: 'Cure Wounds',
      level: 1,
      isCantrip: false,
      prepared: true,
      range: 'Touch',
      castingTime: '1 Action',
      description: 'Heal a creature for 1d8 + Wis.',
    },
  ]);

  weapons = signal<Weapon[]>([
    { name: 'Scimitar', ability: 'dex', damageDie: '1d6', proficient: true, type: 'Slasher' },
  ]);

  castSpell(spell: Spell) {
    if (spell.level === 0) {
      console.log("Cantrips don't use slots!");
      return;
    }

    const slot = this.spellSlots[spell.level];
    if (slot.used() < slot.max()) {
      slot.used.update((current) => current + 1);
    } else {
      alert(`You are out of Level ${spell.level} slots!`);
    }
  }

  wildShapeMax = signal(2);
  wildShapeUsed = signal(0);

  wildShapeRemaining = computed(() => this.wildShapeMax() - this.wildShapeUsed());

  get wildShape() {
    return {
      max: this.wildShapeMax,
      used: this.wildShapeUsed,
      remaining: this.wildShapeRemaining,
    };
  }

  applyWildShape() {
    if (this.wildShapeUsed == this.wildShapeMax) {
      alert('Cannot use wild shape!');
    } else {
      this.wildShapeUsed.update((n) => n + 1);
    }
  }

  // For Short Rest healing
  hitDice = {
    type: 'd8',
    max: signal(3), // Usually equals your level
    remaining: signal(3),
  };

  shortRest() {
    // 1. Reset Wild Shape charges
    this.wildShapeUsed.set(0);

    // 2. Druid "Natural Recovery" (Optional)
    // If you want to implement this, you could add logic to recover some spell slots here.

    console.log('Short Rest complete: Wild Shape charges restored.');
  }

  /**
   * Specifically for spending Hit Dice to heal during a Short Rest
   * @param roll The result of the d8 + Con modifier roll
   */
  spendHitDie(roll: number) {
    if (this.hitDice.remaining() > 0) {
      this.hitDice.remaining.update((n) => n - 1);

      // Add the roll to current HP, but don't exceed Max HP
      this.combat.hp.current.update((hp) => Math.min(this.combat.hp.max(), hp + roll));
    } else {
      alert('No hit dice remaining!');
    }
  }

  longRest() {
    // 1. Reset all spell slots in the array
    this.spellSlots.forEach((slot) => {
      slot.used.set(0);
    });

    // 2. Reset HP to max
    this.combat.hp.current.set(this.combat.hp.max());

    // 3. Reset Hit Dice (Druids regain half their total hit dice on long rest)
    const halfHitDice = Math.max(1, Math.floor(this.level() / 2));
    this.combat.hitDice.remaining.update((current) =>
      Math.min(this.level(), current + halfHitDice)
    );

    this.wildShapeUsed.set(0);

    console.log('Long Rest Complete: HP and Spells restored.');
  }
}
