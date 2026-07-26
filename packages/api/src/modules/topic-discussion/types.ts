/*
 * Topic discussion contract (refactor plan section 5.1). The external
 * interface never exposes Drizzle rows or transaction objects.
 */

export interface CreateTopicInput {
  actorId: string;
  boardId: string;
  title: string;
  content: string;
}

export interface CreateTopicResult {
  topicId: string;
  slug: string;
}

export interface ReplyToTopicInput {
  actorId: string;
  topicId: string;
  content: string;
  quotedPostId?: string;
}

export interface ReplyToTopicResult {
  postId: string;
}

export interface Actor {
  id: string;
  role: string;
}

export interface EditPostInput {
  actor: Actor;
  postId: string;
  content: string;
}

export interface DeleteReplyInput {
  actor: Actor;
  postId: string;
}

export interface DeleteReplyResult {
  alreadyDeleted: boolean;
}

export interface RecordTopicViewInput {
  topicId: string;
  browserSessionId: string;
}

export interface RecordTopicViewResult {
  counted: boolean;
}

export interface TopicDiscussion {
  createTopic(input: CreateTopicInput): Promise<CreateTopicResult>;
  replyToTopic(input: ReplyToTopicInput): Promise<ReplyToTopicResult>;
  editPost(input: EditPostInput): Promise<void>;
  deleteReply(input: DeleteReplyInput): Promise<DeleteReplyResult>;
  recordTopicView(input: RecordTopicViewInput): Promise<RecordTopicViewResult>;
}
