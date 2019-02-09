import getTemplate from 'common/templates';

const nowURL = 'http://localhost:8080';

export function createZip({ utils, state }) {
  const sandboxId = state.get('editor.currentId');
  const sandbox = state.get(`editor.sandboxes.${sandboxId}`);
  return utils.getZip(sandbox).then(result => ({ file: result.file }));
}

export function loadZip({ props, jsZip }) {
  const { file } = props;

  return jsZip.loadAsync(file).then(result => ({ contents: result }));
}

export async function aliasDeployment({ http, path, props, state }) {
  const { nowData, id } = props;
  const token = state.get('user.integrations.zeit.token');
  try {
    const { result } = await http.request({
      url: `${nowURL}/alias/${id}/?token=${token}`,
      body: { alias: nowData.alias },
      method: 'POST',
    });

    return path.success({ message: `Deployment aliased to ${result.url}` });
  } catch (error) {
    console.error(error);
    return path.error({ error });
  }
}

export async function postToZeit({ http, path, props, state }) {
  const { contents } = props;
  const token = state.get('user.integrations.zeit.token');
  const sandboxId = state.get('editor.currentId');
  const sandbox = state.get(`editor.sandboxes.${sandboxId}`);
  const template = getTemplate(sandbox.template);

  try {
    const { result } = await http.request({
      url: `${nowURL}/deployments?token=${token}`,
      body: {
        contents,
        sandbox,
        template,
      },
      method: 'POST',
      headers: { 'Content-type': 'multipart/formdata' },
    });

    const url = `https://${result.url}`;

    return path.success({ url });
  } catch (error) {
    console.error(error);
    return path.error({ error });
  }
}

export function getDeploymentData({ state }) {
  const sandbox = state.get('editor.currentSandbox');
  const nowData =
    sandbox.modules
      .filter(
        m => m.title === 'now.json' || (m.title === 'package.json' && m.now)
      )
      .map(c => JSON.parse(c.code))[0] || {};

  if (!nowData.name) {
    nowData.name = `csb-${sandbox.id}`;
  }

  state.set('deployment.hasAlias', !!nowData.alias);

  return { nowData };
}

export async function getDeploys({ http, path, state, props }) {
  const token = state.get('user.integrations.zeit.token');
  const { nowData } = props;

  try {
    const { result } = await http.request({
      url: `${nowURL}/deployments?token=${token}&name=${nowData.name}`,
    });

    return path.success({ sandboxDeploys: result.deploys });
  } catch (error) {
    return path.error();
  }
}

export async function deleteDeployment({ http, path, state }) {
  const id = state.get('deployment.deployToDelete');
  const token = state.get('user.integrations.zeit.token');

  try {
    await http.request({
      url: `${nowURL}/deployments/${id}/?token=${token}`,
      method: 'DELETE',
    });

    return path.success();
  } catch (error) {
    console.error(error);
    return path.error();
  }
}
