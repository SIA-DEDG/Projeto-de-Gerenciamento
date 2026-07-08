import {
  avatarColor,
  initials,
  statusGroup,
  statusLabelToDb,
  categoryColor,
  statusClass,
} from '../utils';

const AVATAR_COLORS = ['#0052cc', '#36b37e', '#ff5630', '#ffab00', '#6554c0', '#00b8d9'];

describe('avatarColor', () => {
  it('returns fallback for empty string', () => {
    expect(avatarColor('')).toBe('#6B778C');
  });

  it('returns one of the defined palette colors', () => {
    expect(AVATAR_COLORS).toContain(avatarColor('João Silva'));
  });

  it('is deterministic — same name always returns same color', () => {
    expect(avatarColor('Maria')).toBe(avatarColor('Maria'));
  });

  it('different names can produce different colors', () => {
    const colors = new Set(['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Luís'].map(avatarColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('initials', () => {
  it('returns ?? for empty string', () => {
    expect(initials('')).toBe('??');
  });

  it('returns first and last initials for full name', () => {
    expect(initials('João Silva')).toBe('JS');
  });

  it('uses first and last word for three-part names', () => {
    expect(initials('João Maria Silva')).toBe('JS');
  });

  it('returns first two chars uppercased for single name', () => {
    expect(initials('João')).toBe('JO');
  });

  it('is case-insensitive on input', () => {
    expect(initials('ana souza')).toBe('AS');
  });
});

describe('statusGroup', () => {
  it('maps Concluído to done', () => {
    expect(statusGroup('Concluído')).toBe('done');
  });

  it('maps Entrega to done', () => {
    expect(statusGroup('Entrega')).toBe('done');
  });

  it('maps Em Andamento to in_progress', () => {
    expect(statusGroup('Em Andamento')).toBe('in_progress');
  });

  it('maps Design/Conteúdo to in_progress', () => {
    expect(statusGroup('Design/Conteúdo')).toBe('in_progress');
  });

  it('maps Pendente to pending', () => {
    expect(statusGroup('Pendente')).toBe('pending');
  });

  it('maps unknown status to pending', () => {
    expect(statusGroup('Status Desconhecido')).toBe('pending');
  });
});

describe('statusLabelToDb', () => {
  it('maps pending → Pendente', () => {
    expect(statusLabelToDb('pending')).toBe('Pendente');
  });

  it('maps in_progress → Em Andamento', () => {
    expect(statusLabelToDb('in_progress')).toBe('Em Andamento');
  });

  it('maps done → Concluído', () => {
    expect(statusLabelToDb('done')).toBe('Concluído');
  });
});

describe('categoryColor', () => {
  it('returns blue for unknown category', () => {
    expect(categoryColor('Categoria Inexistente')).toBe('blue');
  });

  it('returns blue for empty string', () => {
    expect(categoryColor('')).toBe('blue');
  });

  it('returns correct color for known category', () => {
    expect(categoryColor('TOOLKIT')).toBe('teal');
    expect(categoryColor('INDICADORES')).toBe('green');
    expect(categoryColor('COMUNICAÇÃO')).toBe('red');
  });
});

describe('statusClass', () => {
  it('returns done class for done', () => {
    expect(statusClass('done')).toBe('status-chip done');
  });

  it('returns review class for review', () => {
    expect(statusClass('review')).toBe('status-chip review');
  });

  it('returns progress class for in_progress', () => {
    expect(statusClass('in_progress')).toBe('status-chip progress');
  });

  it('returns pending class for pending', () => {
    expect(statusClass('pending')).toBe('status-chip pending');
  });
});
