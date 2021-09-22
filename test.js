var assert = require('assert');
var child_process = require('child_process');

async function run(cwd, cmd, ...args) {
    return new Promise((resolve, reject) => {
        const spawned = child_process.spawn(cmd, args, { cwd });

        const stdOut = [];
        const stdErr = [];

        spawned.stderr.on("data", (data) => {
            stdErr.push(data);
        });
        spawned.stdout.on("data", (data) => {
            stdOut.push(data);
        });
        spawned.on("close", (exitCode) => {
            const res = {stdOut: stdOut.join(), stdErr: stdErr.join(), exitCode};
            console.log(res);
            resolve(res);
        });
        spawned.on("error", (err) => {
            console.error(err);
            reject(err);
        });
    });
} 

describe('if underlying ssh connection is configured to `keepalive`', function() {
    it('should fire `close` event', async function() {
      const sshConfig = await run('/tmp', 'ssh', '-G', 'localhost');
      assert(sshConfig.stdOut.includes('ControlMaster auto\n'.toLowerCase()));
      assert(sshConfig.stdOut.includes('ControlPersist 600\n'.toLowerCase()));

      const clone = await run('/tmp', 'git', 'clone', 'ssh://git@localhost:2222/opt/git/project.git');
      assert.equal(clone.exitCode, 0);
      assert.equal(clone.stdOut, '');
      assert.equal(clone.stdErr,
        "Cloning into 'project'...\n" +
        ",Warning: Permanently added '[localhost]:2222' (ECDSA) to the list of known hosts.\r\n" +
        ',warning: You appear to have cloned an empty repository.\n');

      await run('/tmp/project', 'touch', 'README.md');
      const add = await run('/tmp/project', 'git', 'add', 'README.md');
      assert.equal(add.exitCode, 0);
      assert.equal(add.stdOut, '');
      assert.equal(add.stdErr, '');

      const commit = await run('/tmp/project', 'git', 'commit', '-m', 'Add README.md');
      const revParse = await run('/tmp/project', 'git', 'rev-parse', '--short', 'HEAD');
      assert.equal(commit.exitCode, 0);
      assert.equal(revParse.exitCode, 0);
      assert.equal(commit.stdOut,
        '[master (root-commit) ' + revParse.stdOut.trim() + '] Add README.md\n' +
        ' 1 file changed, 0 insertions(+), 0 deletions(-)\n' +
        ' create mode 100644 README.md\n');
      assert.equal(commit.stdErr, '');

      const push = await run('/tmp/project', 'git', 'push', '-u', 'origin', 'master');
      assert.equal(push.exitCode, 0);
      assert.equal(push.stdOut, 'Branch master set up to track remote branch master from origin.\n');
      assert.equal(push.stdErr,
        'To ssh://localhost:2222/opt/git/project.git\n' +
        ' * [new branch]      master -> master\n');

      const pull = await run('/tmp/project', 'git', 'fetch', 'origin');
      assert.equal(pull.exitCode, 0);
      assert.equal(pull.stdOut, '');
      assert.equal(pull.stdErr, '');
    });
});