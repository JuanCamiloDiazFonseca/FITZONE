export type ModuleStatus = {
  module: string;
  status: 'scaffolded';
  message: string;
};

export function describeModule(module: string): ModuleStatus {
  return {
    module,
    status: 'scaffolded',
    message: 'Estructura inicial lista; las operaciones se definirán según el SRS.',
  };
}
