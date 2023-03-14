import express from 'express';

import * as H5P from '@lumieducation/h5p-server';
import { IRequestWithUser, IRequestWithLanguage } from '@lumieducation/h5p-express';



/**
 * @param h5pEditor
 * @param h5pPlayer
 * @param languageOverride the language to use. Set it to 'auto' to use the
 * language set by a language detector in the req.language property.
 * (recommended)
 */
export default function (
    h5pEditor: H5P.H5PEditor,
    h5pPlayer: H5P.H5PPlayer,
    languageOverride: string | 'auto' = 'auto'
): express.Router {
    const router = express.Router();

    let user =<H5P.IUser>{}; // user object


    router.get(
        `${h5pEditor.config.playUrl}/:contentId`,
        async (req: IRequestWithLanguage &IRequestWithUser, res) => {
          req.user = user;
            try {
                const h5pPage = await h5pPlayer.render(
                    req.params.contentId,
                    user,
                    languageOverride === 'auto'
                        ? req.language ?? 'en'
                        : languageOverride,
                    {
                        showCopyButton: true,
                        showDownloadButton: true,
                        showFrame: true,
                        showH5PIcon: true,
                        showLicenseButton: true
                    }
                );
                res.send(h5pPage);
                res.status(200).end();
            } catch (error) {
                res.status(500).end(error.message);
            }
        }
    );

    router.get(
        '/edit/:contentId',
        async (req, res) => {
            const page = await h5pEditor.render(
                req.params.contentId,'en',user
            );
            res.send(page);
            res.status(200).end();
        }
    );

    router.post('/edit/:contentId', async (req, res) => {
        const contentId = await h5pEditor.saveOrUpdateContent(
            req.params.contentId.toString(),
            req.body.params.params,
            req.body.params.metadata,
            req.body.library,
            user
        );

        res.send(JSON.stringify({ contentId }));
        res.status(200).end();
    });

    router.get(
        '/new',
        async (req, res) => {
            const page = await h5pEditor.render(
                undefined,'en',user
            );
            res.send(page);
            res.status(200).end();
        }
    );

    router.post('/new', async (req, res) => {
      console.log(req.body)
      console.log(user)
        if (
            !req.body.params ||
            !req.body.params.params ||
            !req.body.params.metadata ||
            !req.body.library ||
            !user
        ) {
            res.status(400).send('Malformed request').end();
            return;
        }
        const contentId = await h5pEditor.saveOrUpdateContent(
            undefined,
            req.body.params.params,
            req.body.params.metadata,
            req.body.library,
            user
        );

        res.send(JSON.stringify({ contentId }));
        res.status(200).end();
    });

    router.get('/delete/:contentId', async (req, res) => {
        try {
            await h5pEditor.deleteContent(req.params.contentId, user);
        } catch (error) {
            res.send(
                `Error deleting content with id ${req.params.contentId}: ${error.message}<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
            );
            res.status(500).end();
            return;
        }

        res.send(
            `Content ${req.params.contentId} successfully deleted.<br/><a href="javascript:window.location=document.referrer">Go Back</a>`
        );
        res.status(200).end();
    });

    return router;
}
