import { Docbase, DocbaseClient } from "./docbase-client";
import { importConfig, exportConfig } from "./config";

const TAG_IMPORTED = `imported-${getCurrent()}`;
const TAG_EXPORTED = "exported";

const clientSrc = new DocbaseClient(exportConfig);
const clientDst = new DocbaseClient(importConfig);

main();

async function main(): Promise<void> {
  const per_page = 20;
  let imported = 0;
  let page = 0;
  for (;;) {
    const r = await clientSrc.getPosts(`-tag:${TAG_EXPORTED}`, page, per_page);
    if (!r.posts || r.posts.length == 0) {
      break;
    }
    for (let i = 0; i < r.posts.length; i++) {
      const p = r.posts[i];
      console.log(
        `(${imported}/${r.meta.total}) [${p.id}]: importing\t${p.title}`
      );
      await copy(p);
      await tag(p);
      console.log(`(${imported}/${r.meta.total}) [${p.id}]: imported`);
      imported++;
    }
    page++;
    if (r.meta.total <= imported) {
      break;
    }
  }
}

async function tag(current: Docbase.Memo): Promise<void> {
  const update = {
    id: current.id,
    tags: [TAG_EXPORTED].concat(current.tags.map(({ name }) => name)),
  };
  await clientSrc.updateMemo(update);
}

async function copy(post: Docbase.Memo): Promise<void> {
  // 添付ファイルのエクスポート&インポート
  const uploads: { name:string, content:ArrayBuffer}[] = [];
  const attachment_maps:AttachmentMaps = [];
  for(let i = 0;i < post.attachments.length; i++) {
    const a = post.attachments[i];
    const { id, name, url: url_src } = a;
    const content = await clientSrc.getAttachment(id); 
    uploads.push({name, content});
    attachment_maps.push( { name, src: url_src, dst: '' });
  }

  const uploaded = await clientDst.postAttachment(uploads);
  uploaded.forEach(u => {
    const f = attachment_maps.find(e => e.name == u.name );
    if (!f) throw `${name} not found`;
    f.dst = u.url;
  });
  console.log('[attachment_maps]')
  console.dir(uploaded);

  // メモのインポート
  const { title, created_at } = post;
  const tags = post.tags.map(({ name }) => name);
  const body = `
  orignal-id: ${exportConfig.domain}-${post.id}\r\n
  旧投稿者: ${post.user.name}, 旧投稿日: ${post.created_at}\r\n
  \r\n
  ${convert_attachment_url(post.body, attachment_maps)}`;

  const postDst: Docbase.PostMemoRequest = {
    title,
    body,
    tags,
    published_at: created_at,
    scope: "group",
    groups: importConfig.groups,
    author_id: importConfig.author_id,
  };
  postDst.tags.push(TAG_IMPORTED);
  console.log(postDst);
  const { id: id_dst } = await clientDst.postMemo(postDst);
  console.log(`\t[done] postMemp ${id_dst}`);

  // コメントのインポート
  {
    await Promise.all(
      post.comments.map(async (c) => {
        await clientDst.postComment(
          id_dst,
          convert_attachment_url(c.body, attachment_maps),
          importConfig.author_id,
          c.created_at
        );
        console.log(`\t[done] postComment ${id_dst}`);
      })
    );
  }
}

type AttachmentMap = { name: string, src: string; dst: string };
type AttachmentMaps = AttachmentMap[];
function convert_attachment_url(
  body: string,
  attachment_maps: AttachmentMaps
): string {
  return attachment_maps.reduce(
    (t, m: AttachmentMap) => t.replace(m.src, m.dst),
    body
  );
}

function getCurrent(): string {
  const dt = new Date();
  const y = dt.getFullYear();
  const mon = ("00" + (dt.getMonth() + 1)).slice(-2);
  const d = ("00" + dt.getDate()).slice(-2);
  const h = ("00" + dt.getHours()).slice(-2);
  const min = ("00" + dt.getMinutes()).slice(-2);
  const result = `${y}${mon}${d}-${h}${min}`;
  return result;
}
