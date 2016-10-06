#!groovy
@Library('sketchfab@master')
import sketchfab.docker.Docker
import sketchfab.git.Git
import sketchfab.machines.Machines
import sketchfab.slack.Slack

def docker = new Docker()
def machines = new Machines()
def slack = new Slack()
def git = new Git()


if (env.BRANCH_NAME == 'master') {

  def ENV = 'prod'
  def domain = 'labs.sketchfab.com'

  node(ENV + '-deployer') {
    checkout scm

    def sha1 = git.sha1()
    def short_sha1 = git.to_short(sha1)

    def notif = "<${env.BUILD_URL}|Build #${env.BUILD_NUMBER}> | console: <${env.BUILD_URL}console|${env.BRANCH_NAME}> | sha1: <https://github.com/sketchfab/experiments/tree/${sha1}|${short_sha1}>"

    try {

      stage 'Deploy'

      slack.notify('', '#ops', [[
        author_name: domain,
        author_link: 'https://' + domain,
        title: ':squirrel: Experiments deploy triggered.',
        text: notif,
        color: "#EAEAEA"
      ]])

      docker.login()

      def cmd = './run.sh deploy_labs_experiments'
      boolean fetch_creds = true
      def user = "${ENV}-deployer"
      def private_key = "./stash/ssh-keys/${ENV}-deployer"

      machines.run(cmd, ENV, fetch_creds, user, private_key)

      // Build successful
      slack.notify('', '#ops', [[
        author_name: domain,
        author_link: 'https://' + domain,
        title: ':rocket: Experiments deployed.',
        text: notif,
        color: "good"
      ]])

    } catch (exc) {

      // Build failed
      slack.notify('', '#ops', [[
        author_name: domain,
        author_link: 'https://' + domain,
        title: ':warning: Experiments deploy FAILED.',
        text: notif,
        color: "danger"
      ]])

      throw exc
    }
  }
}
