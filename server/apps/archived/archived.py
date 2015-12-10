# -*- coding: utf-8; -*-
#
# This file is part of Superdesk.
#
# Copyright 2013, 2014 Sourcefabric z.u. and contributors.
#
# For the full copyright and license information, please see the
# AUTHORS and LICENSE files distributed with this source code, or
# at https://www.sourcefabric.org/superdesk/license

from eve.utils import config
import logging
from apps.publish.published_item import PublishedItemService, PublishedItemResource
from apps.packages import PackageService
from superdesk.metadata.utils import aggregations
from superdesk.metadata.item import CONTENT_TYPE, ITEM_TYPE
from superdesk.metadata.packages import PACKAGE_TYPE, TAKES_PACKAGE, RESIDREF, SEQUENCE
from superdesk.notification import push_notification
from apps.archive.common import get_user
import superdesk

logger = logging.getLogger(__name__)


class ArchivedResource(PublishedItemResource):
    datasource = {
        'search_backend': 'elastic',
        'aggregations': aggregations,
        'default_sort': [('_updated', -1)],
        'projection': {
            'old_version': 0,
            'last_version': 0
        }
    }

    resource_methods = ['GET']
    item_methods = ['GET', 'DELETE']

    privileges = {'DELETE': 'archived'}
    additional_lookup = {
        'url': 'regex("[\w,.:-]+")',
        'field': 'item_id'
    }


class ArchivedService(PublishedItemService):

    def on_create(self, docs):
        package_service = PackageService()

        for doc in docs:
            doc.pop('lock_user', None)
            doc.pop('lock_time', None)
            doc.pop('lock_session', None)

            if doc.get(ITEM_TYPE) == CONTENT_TYPE.COMPOSITE:
                is_takes_package = doc.get(PACKAGE_TYPE) == TAKES_PACKAGE
                for ref in package_service.get_item_refs(doc):
                    if ref.get('location') == 'published':
                        ref['location'] = 'archived'
                    else:
                        if is_takes_package:
                            package_service.remove_ref_from_inmem_package(doc, ref.get(RESIDREF))

                if is_takes_package:
                    doc[SEQUENCE] = len(package_service.get_item_refs(doc))

    def on_deleted(self, doc):
        user = get_user()
        push_notification('item:deleted:archived', item=str(doc[config.ID_FIELD]), user=str(user.get(config.ID_FIELD)))


superdesk.privilege(name='archived', label='Archived Management', description='User can remove items from the archived')
