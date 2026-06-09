declare module "markdown-it-task-lists" {
  import type { PluginWithOptions } from "markdown-it";
  interface TaskListsOptions {
    enabled?: boolean;
    label?: string;
    labelAfter?: boolean;
  }
  const markdownItTaskLists: PluginWithOptions<TaskListsOptions>;
  export default markdownItTaskLists;
}
