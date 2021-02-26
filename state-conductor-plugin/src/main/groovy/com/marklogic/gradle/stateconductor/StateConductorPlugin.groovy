package com.marklogic.gradle.stateconductor

import com.marklogic.gradle.stateconductor.tasks.ScaffoldStateMachineTask
import org.gradle.api.Project
import org.gradle.api.Plugin

public class StateConductorPlugin implements Plugin<Project> {
    public void apply(Project project) {
        // Register tasks
        project.tasks.register("greeting") {
            doLast {
                println("Hello from plugin 'com.marklogic.gradle.stateconductor.state-conductor'")
            }
        }

      String scaffoldGroup = "state-conductor Scaffold"
      project.task("scScaffoldStateMachine", type: ScaffoldStateMachineTask, group: scaffoldGroup, description: "Creates a State Conductor State Machine definition")
    }
}
