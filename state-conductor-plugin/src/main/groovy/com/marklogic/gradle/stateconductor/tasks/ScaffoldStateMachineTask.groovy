package com.marklogic.gradle.stateconductor.tasks

import org.gradle.api.DefaultTask
import org.gradle.api.tasks.TaskAction

class ScaffoldStateMachineTask extends DefaultTask {

  @TaskAction
  def createStateMachine() {
    println 'hello world!'
  }

}
