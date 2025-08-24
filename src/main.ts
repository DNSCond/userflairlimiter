import { Devvit, TriggerContext } from "@devvit/public-api";

Devvit.configure({ redditAPI: true, });

Devvit.addSettings([
  {
    type: 'string',
    name: 'onlyOnUpdate',
    label: 'put flair_template_id\'s of post flairs that only may be on update, seperated by commas',
  },
  {
    type: 'string',
    name: 'onlyOnSubmit',
    label: 'put flair_template_id\'s of post flairs that only may be on submit, seperated by commas',
  },
  {
    type: 'paragraph',
    name: 'message',
    label: 'what to send to the user?',
    helpText: 'this will either be the report reason or the removal reason, supports markdown if removal',
    defaultValue: 'Your Post has been removed because a flair was changed against the rules.',
  },
  {
    type: 'select', name: 'remove_report',
    label: 'remove or report?',
    options: [createOption('report'), createOption('remove')],
    defaultValue: ['report'],
    multiSelect: false,
  },
  {
    type: 'boolean', name: 'comment',
    label: 'comment the comment anyway?',
    defaultValue: false,
  },
]);

function createOption(this: typeof createOption.prototype, name: string): { label: string, value: string } {
  const label = String(name), value = label;
  return Object.assign((new.target ? this : Object.create(createOption.prototype)), { label, value });
}

Devvit.addTrigger({
  event: 'PostFlairUpdate',
  async onEvent(event, context: TriggerContext) {
    // event.author?.name is the one who changed thr flair
    // console.log(event.author?.name);

    const templateId: string | undefined = event.post?.linkFlair?.templateId;
    if (templateId === undefined) return;
    // let postFlairs = await context.settings.get('onlyOnUpdate');
    let postFlairs = await context.settings.get('onlyOnSubmit');
    if (typeof postFlairs !== 'string') return;
    postFlairs = postFlairs.split(/[,\s]+/).filter(s => s.length > 0);
    if (postFlairs.length > 0 && context.subredditName && event.author?.name && event.post) {
      const isMod = (await context.reddit.getModerators({ subredditName: context.subredditName }).all()).map(u => u.username).includes(event.author.name);
      if (isMod) return;
      const item = await context.reddit.getPostById(event.post.id),
        action = (await context.settings.get('remove_report') ?? []) as string[],
        reason = ((await context.settings.get('message')) ?? 'Your Post has been removed because a flair was changed against the rules.') as string;

      if (action.includes('remove')) {
        context.reddit.submitComment({
          id: item.id, text: reason,
        });
        item.remove();
        return;
      } else {
        context.reddit.report(item, { reason });
      }
    }
  },
});

Devvit.addTrigger({
  event: 'PostCreate',
  async onEvent(event, context: TriggerContext) {
    // event.author?.name is the one who changed thr flair
    // console.log(event.author?.name);

    const templateId: string | undefined = event.post?.linkFlair?.templateId,
      flair_text: string | undefined = event.post?.linkFlair?.text;
    if (templateId === undefined || flair_text === undefined) return;
    // let postFlairs = await context.settings.get('onlyOnUpdate');
    let postFlairs = await context.settings.get('onlyOnUpdate');
    if (typeof postFlairs !== 'string') return;
    postFlairs = postFlairs.split(/[,\s]+/).filter(s => s.length > 0);
    if (postFlairs.length > 0 && context.subredditName && event.author?.name && event.post) {
      if (postFlairs.includes(templateId)) {
        const isMod = (await context.reddit.getModerators({ subredditName: context.subredditName }).all()).map(u => u.username).includes(event.author.name);
        if (isMod) return;
        const item = await context.reddit.getPostById(event.post.id),
          action = (await context.settings.get('remove_report') ?? []) as string[];
        const text = ((await context.settings.get('message')) ?? 'Your Post has been removed because a flair was changed against the rules.') as string;

        if (await context.settings.get('comment')) {
          (await context.reddit.submitComment({
            id: item.id, text,
          })).distinguish(true);
        }
        if (action.includes('remove')) {
          item.remove();
        } else if (action.includes('report')) {
          const reason = `${text}`;
          context.reddit.report(item, { reason });
        }
      }
    }
  },
});

export default Devvit;
